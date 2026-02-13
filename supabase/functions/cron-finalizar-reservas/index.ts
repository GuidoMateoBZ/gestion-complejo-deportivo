import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  // Cliente con permisos de admin (Service Role Key) para poder editar sin RLS del usuario
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Calcular el tiempo límite: 1 hora en milisegundos
  // Las reservas que empezaron hace MÁS de 1 hora, ya deberían haber terminado.
  const ONE_HOUR_MS = 60 * 60 * 1000;
  const cutoffTime = new Date(Date.now() - ONE_HOUR_MS).toISOString();

  // Buscar reservas VIGENTES (1) o EN CURSO (2) cuya hora de inicio sea anterior al tiempo límite (ya terminaron)
  const { data: reservas, error } = await supabase
    .from('reservas')
    .select('*')
    .in('id_estado', [1, 2])
    .lt('fecha_y_hora_reservada', cutoffTime)
  
  if (error) {
    console.error('Error fetching reservations:', error)
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    })
  }
  //Si hay reservas para cada reserva ver si está confirmada y si se pagó el total
  for (const reserva of reservas) {
    //Si la reserva está confirmada (asistió)
    if (reserva.id_estado === 2) {
      const {data:pago, error:errorPago}=await supabase
      .from('pagos')
      .select('*')
      .eq('id_reserva', reserva.id_reserva)
      .maybeSingle()
      if (errorPago) {
        console.error('Error fetching pagos for reserva:', reserva.id_reserva, errorPago)
        // Continuamos con la siguiente reserva
        continue
      }
      //Si pagó el total
      if (pago && pago.monto_pago >= reserva.tarifa_total) {
        const { error: errorUpdate } = await supabase
          .from('reservas')
          .update({ id_estado: 3 }) // 3 = Finalizada
          .eq('id_reserva', reserva.id_reserva)
        
        if (errorUpdate) {
          console.error('Error updating reserva:', reserva.id_reserva, errorUpdate)
        }
      }
      //Si no pagó el total
      else{
        const { error: errorUpdate } = await supabase
          .from('reservas')
          .update({ id_estado: 4 }) // 4 = PendienteDePago (No pagada)
          .eq('id_reserva', reserva.id_reserva)
        
        if (errorUpdate) {
          console.error('Error updating reserva:', reserva.id_reserva, errorUpdate)
        } else {
            // Enviar email de recordatorio de pago pendiente
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
                            subject: `Recordatorio de Pago Pendiente #${reserva.id_reserva} - GSD`,
                            html: `
                            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                                <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                                    <div style="background-color: #eab308; padding: 20px; text-align: center;">
                                        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Recordatorio de Pago</h1>
                                    </div>
                                    <div style="padding: 30px;">
                                        <p style="font-size: 16px; line-height: 1.5;">Hola <strong>${usuarioData.nombre_usuario || 'Usuario'}</strong>,</p>
                                        <p style="font-size: 16px; line-height: 1.5;">Tu reserva ha finalizado pero registramos un saldo pendiente. Por favor, regulariza tu situación para evitar recargos e inhabilitación de cuenta.</p>
                                        <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin-top: 20px;">
                                            <h3 style="margin: 0 0 10px 0; font-size: 18px; color: #111827;">Detalles:</h3>
                                            <ul style="list-style: none; padding: 0; margin: 0;">
                                                <li style="padding: 5px 0;"><strong>ID Reserva:</strong> #${reserva.id_reserva}</li>
                                                <li style="padding: 5px 0;"><strong>Fecha:</strong> ${new Date(reserva.fecha_y_hora_reservada).toLocaleDateString()}</li>
                                                <li style="padding: 5px 0;"><strong>Monto Pendiente:</strong> $${reserva.tarifa_total - (pago?.monto_pago || 0)}</li>
                                            </ul>
                                        </div>
                                        <div style="margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px; font-size: 14px; color: #6b7280;">
                                            <p>Tienes 24 horas para abonar el saldo restante.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            `
                        })
                    })
                }
            }
        }
      }
    }

    //Si la reserva no fue confirmada y está solamente Vigente (1) (no asistió)
    if (reserva.id_estado === 1) {
      const { error: errorUpdate } = await supabase
        .from('reservas')
        .update({ id_estado: 6 }) // 6 = Ausente
        .eq('id_reserva', reserva.id_reserva)
      if (errorUpdate) {
        console.error('Error updating reserva:', reserva.id_reserva, errorUpdate)
      }
    }
  }

  return new Response(JSON.stringify({ message: 'Proceso finalizado correctamente' }), { 
    status: 200,
    headers: { "Content-Type": "application/json" }
  })
})