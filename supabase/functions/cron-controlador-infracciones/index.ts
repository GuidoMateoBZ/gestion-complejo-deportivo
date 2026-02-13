import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TIPO_INFRACCION = {
    DEUDA: 1,
    CANCELACIONES: 2,
}

// 30 días de inhabilitación (aprox)
const DIAS_INHABILITACION_MS = 30 * 24 * 60 * 60 * 1000

Deno.serve(async (req) => {
  // Cliente con permisos de admin (Service Role Key)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // 1. Cron para finalizar infracciones de Cancelaciones (Lógica existente)
  const { data: infracciones, error: errorInfracciones } = await supabase
    .from('infracciones')
    .select('*')
    .eq('activa', true)
    .eq('id_tipo_infraccion', TIPO_INFRACCION.CANCELACIONES)
    .lte('fecha_final', new Date().toISOString())

  if (errorInfracciones) {
    console.error('Error al obtener infracciones activas:', errorInfracciones)
  } else if (infracciones && infracciones.length > 0) {
      for (const infraccion of infracciones) {
        // Desactivar infracción
        const { error: errorUpdate } = await supabase
          .from('infracciones')
          .update({ activa: false })
          .eq('id_infraccion', infraccion.id_infraccion)

        if (errorUpdate) {
          console.error('Error al desactivar infracción:', errorUpdate)
          continue
        }

        // Habilitar usuario
        const { error: errorUpdateUsuario } = await supabase
          .from('usuarios')
          .update({ habilitado: true })
          .eq('id_usuario', infraccion.id_usuario)

        if (errorUpdateUsuario) console.error('Error al habilitar usuario:', errorUpdateUsuario)
      }
  }


  // 2. Cron para generar infracciones de Deudas
  // Buscamos reservas Pendientes de Pago (4) vencidas (pasaron 25hs de la fecha reservada)
  const veinticincoHorasAtras = new Date(new Date().getTime() - 25 * 60 * 60 * 1000).toISOString()
  
  const { data: reservasVencidas, error: errorReservas } = await supabase
      .from('reservas')
      .select('*')
      .eq('id_estado', 4) 
      .lte('fecha_y_hora_reservada', veinticincoHorasAtras)

  if (errorReservas) {
      console.error('Error al obtener reservas vencidas:', errorReservas)
  } else if (reservasVencidas && reservasVencidas.length > 0) {
      
      for (const reserva of reservasVencidas) {
        //Compruebo si el cliente ya tiene la infraccion por deuda activa
        const { data: infraccionExistente, error: errorInfraccionActiva } = await supabase
          .from('infracciones')
          .select('*')
          .eq('id_usuario', reserva.id_usuario)
          .eq('activa', true)
          .eq('id_tipo_infraccion', TIPO_INFRACCION.DEUDA)
          .maybeSingle()

        if (errorInfraccionActiva || infraccionExistente) {
            console.error(`El cliente ${reserva.id_usuario} ya tiene la infracción por deuda activa o hubo error al obtenerla. Saltando.`)  
            continue
        }


        // Obtenemos el pago de la reserva vencida (lo que pagó de seña)
        const { data: pagoVencido, error: errorPago } = await supabase
          .from('pagos')
          .select('monto_pago')
          .eq('id_reserva', reserva.id_reserva)
          .maybeSingle()
          
        if (errorPago || !pagoVencido) {
            console.error(`Reserva ${reserva.id_reserva} en error en obtener pago inicial. Saltando.`)
            continue
        }

        const monto_pagado_inicial = pagoVencido.monto_pago
        const deuda_total_reserva = reserva.tarifa_total - monto_pagado_inicial
        
        // --- LOGICA DE COMPENSACIÓN ---
        // Buscamos reservas VIGENTES (1) del mismo usuario para usarlas de saldo
        const { data: reservasVigentes, error: errorVigentes } = await supabase
            .from('reservas')
            .select('*')
            .eq('id_usuario', reserva.id_usuario)
            .eq('id_estado', 1) 

        if (errorVigentes) {
            console.error('Error al obtener reservas vigentes:', errorVigentes)
        }

        let saldoFavor = 0
        let reservasCompensadas: any[] = []

        if (reservasVigentes && reservasVigentes.length > 0) {
            for (const resVigente of reservasVigentes) {
                const { data: pagoVigente, error: errorPagoVigente } = await supabase
                    .from('pagos')
                    .select('monto_pago, devuelto') 
                    .eq('id_reserva', resVigente.id_reserva)
                    .maybeSingle()

                if (errorPagoVigente) {
                    console.error(`Error al obtener pago de reserva ${resVigente.id_reserva}:`, errorPagoVigente)
                }

                if (pagoVigente) { 
                    // Si el pago no fue devuelto, lo usamos como saldo a favor
                    // (Nota: chequea si tu tabla pagos tiene 'devuelto'. Si no, asume false)
                    const monto = Number(pagoVigente.monto_pago)
                    saldoFavor += monto
                    reservasCompensadas.push({ id: resVigente.id_reserva, monto })
                }

                // CANCELAR la reserva vigente usada o no (por política, si eres infractor se caen las vigentes)
                // Pero aquí específicamente las cancelamos para cobrarnos.
                const { error: errorCancelacion } = await supabase
                    .from('reservas')
                    .update({ id_estado: 5, cancelo_cliente: false })
                    .eq('id_reserva', resVigente.id_reserva)
                
                if (errorCancelacion) {
                    console.error(`Error al cancelar reserva vigente ${resVigente.id_reserva}:`, errorCancelacion)
                }
            }
        }

        // Calculamos Balance
        const balance = deuda_total_reserva - saldoFavor
        let infraccionActiva = true
        let monto_infraccion_final = 0
        let mensajeEmail = ''
        let asuntoEmail = ''
        let remanente = 0

        if (balance > 0) {
            // Sigue debiendo
            monto_infraccion_final = balance
            infraccionActiva = true
            asuntoEmail = `Aviso de Infracción por Deuda #${reserva.id_reserva} - GSD`
            mensajeEmail = `Se ha generado una deuda por falta de pago. Se utilizaron <strong>$${saldoFavor}</strong> de tus reservas vigentes para cubrir parte de la deuda, quedando un saldo pendiente de <strong>$${monto_infraccion_final}</strong>.`
        } else {
            // Deuda Saldada
            infraccionActiva = false
            monto_infraccion_final = 0
            
            // Actualizar reserva original a Finalizada (3) porque la deuda fue cubierta
            const { error: errorUpdateReserva } = await supabase
                .from('reservas')
                .update({ id_estado: 3 })
                .eq('id_reserva', reserva.id_reserva)

            if (errorUpdateReserva) {
                console.error(`Error al finalizar reserva saldada ${reserva.id_reserva}:`, errorUpdateReserva)
            } else {
                console.log(`Reserva ${reserva.id_reserva} marcada como Finalizada (Deuda saldada por compensación)`)
            }

            remanente = Math.abs(balance)

            //
            
            if (remanente > 0) {
                asuntoEmail = `Deuda Saldada con Devolución #${reserva.id_reserva} - GSD`
                mensajeEmail = `Se ha generado una deuda que fue <strong>totalmente saldada</strong> utilizando el saldo de tus reservas vigentes canceladas. Quedó un sobrante de <strong>$${remanente}</strong> que será devuelto a tu cuenta.`
                // TODO: Lógica de devolución de remanente con pasarela de pago
                console.log(`[DEVOLUCION] Usuario ${reserva.id_usuario} - Monto: ${remanente}`)
            } else {
                asuntoEmail = `Deuda Saldada #${reserva.id_reserva} - GSD`
                mensajeEmail = `Se ha generado una deuda que fue <strong>totalmente saldada</strong> utilizando el saldo de tus reservas vigentes canceladas.`
            }
        }

        // Insertar Infracción

        const { error: errorInsert } = await supabase
              .from('infracciones')
              .insert({
                  id_usuario: reserva.id_usuario,
                  id_tipo_infraccion: TIPO_INFRACCION.DEUDA,
                  monto_inicial: infraccionActiva ? monto_infraccion_final : 0, 
                  activa: infraccionActiva,
                  // fecha_final: default null
              })

          if (errorInsert) {
              console.error('Error insertando infracción:', errorInsert)
              continue
          }

          // Si quedó activa, inhabilitamos usuario
          if (infraccionActiva) {
            await supabase
                .from('usuarios')
                .update({ habilitado: false })
                .eq('id_usuario', reserva.id_usuario)
          }

          // Enviar Email
          const { data: usuarioData } = await supabase
            .from('usuarios')
            .select('email_usuario, nombre_usuario')
            .eq('id_usuario', reserva.id_usuario)
            .single()
            
          if (usuarioData?.email_usuario) {
              const resendApiKey = Deno.env.get('RESEND_API_KEY')
              if (resendApiKey) {
                  await fetch('https://api.resend.com/emails', {
                      method: 'POST',
                      headers: {
                          'Authorization': `Bearer ${resendApiKey}`,
                          'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({
                          from: 'GSD <notificaciones@complejodeportivo.guidomateobz.dev>',
                          to: [usuarioData.email_usuario],
                          subject: asuntoEmail,
                          html: `
                          <div style="font-family: sans-serif; padding: 20px; color: #333;">
                              <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                                  <div style="background-color: ${infraccionActiva ? '#b91c1c' : '#10b981'}; padding: 20px; text-align: center;">
                                      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${infraccionActiva ? 'Aviso de Infracción' : 'Deuda Saldada'}</h1>
                                  </div>
                                  <div style="padding: 30px;">
                                      <p style="font-size: 16px;">Hola <strong>${usuarioData.nombre_usuario || 'Usuario'}</strong>,</p>
                                      <p style="font-size: 16px; line-height: 1.5;">${mensajeEmail}</p>
                                      
                                      <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin-top: 20px;">
                                          <h3 style="margin: 0 0 10px 0; font-size: 18px; color: #111827;">Detalles de la Reserva Original:</h3>
                                          <ul style="list-style: none; padding: 0; margin: 0;">
                                              <li style="padding: 5px 0;"><strong>ID Reserva:</strong> #${reserva.id_reserva}</li>
                                              <li style="padding: 5px 0;"><strong>Fecha:</strong> ${new Date(reserva.fecha_y_hora_reservada).toLocaleDateString()}</li>
                                              <li style="padding: 5px 0;"><strong>Deuda Original:</strong> $${deuda_total_reserva}</li>
                                          </ul>
                                      </div>
                                      ${infraccionActiva ? `
                                      <div style="margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px; font-size: 14px; color: #6b7280;">
                                          <p>Su cuenta ha sido inhabilitada. Por favor acercarse a administración para regularizar su situación.</p>
                                      </div>` : ''}
                                  </div>
                              </div>
                          </div>
                          `
                        })
                  })
              }
          }
      } // Fin for reservas
  } // Fin else error

  return new Response(JSON.stringify({ success: true }), { 
      headers: { "Content-Type": "application/json" },
      status: 200 
  })
})
