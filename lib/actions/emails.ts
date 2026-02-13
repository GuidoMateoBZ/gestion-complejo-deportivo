'use server'

import { Resend } from 'resend';
import { EmailTemplate } from '@/components/email-template';
import { createClient } from '@/lib/supabase/server';
import React from 'react';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = 'GSD <notificaciones@complejodeportivo.guidomateobz.dev>'; 

// Tipos de datos para las funciones
interface ReservaEmailData {
  idReserva?: number;
  idUsuario?: string;
  emailUsuario?: string;
  nombreUsuario?: string;
  instalacion?: string;
  fecha?: string;
  monto?: number | string;
}

/**
 * Busca: Email y Nombre del usuario, Nombre de Instalación y Fecha.
 */
async function completarDatosReserva(data: ReservaEmailData) {
    // Si ya tenemos todo, retornamos
    if (data.emailUsuario && data.instalacion && data.fecha) {
        return data;
    }

    const supabase = await createClient();

    // Estrategia 1: Si tenemos idReserva, buscamos todo junto
    if (data.idReserva) {
        const { data: reserva } = await supabase
            .from('reservas')
            .select(`
                fecha_y_hora_reservada,
                usuario:usuarios (
                    id_usuario,
                    email_usuario,
                    nombre_usuario
                ),
                instalacion:instalaciones (
                    nombre_instalacion
                )
            `)
            .eq('id_reserva', data.idReserva)
            .single();

        if (reserva) {
            // Rellenar datos si faltan
            const usuario = reserva.usuario as any;
            const instalacion = reserva.instalacion as any;

            if (!data.emailUsuario) data.emailUsuario = usuario?.email_usuario || '';
            if (!data.nombreUsuario) data.nombreUsuario = usuario?.nombre_usuario || 'Cliente';
            if (!data.idUsuario) data.idUsuario = usuario?.id_usuario;
            
            if (!data.instalacion) data.instalacion = instalacion?.nombre_instalacion || '';
            
            if (!data.fecha) {
                data.fecha = new Date(reserva.fecha_y_hora_reservada).toLocaleString('es-AR', { 
                    timeZone: 'America/Argentina/Buenos_Aires',
                    dateStyle: 'long', 
                    timeStyle: 'short'
                });
            }
        }
    } 
    // Estrategia 2: Si solo tenemos idUsuario (caso genérico sin reserva)
    else if (data.idUsuario && !data.emailUsuario) {
        const { data: usuario } = await supabase
            .from('usuarios')
            .select('email_usuario, nombre_usuario')
            .eq('id_usuario', data.idUsuario)
            .single();
        
        if (usuario) {
            data.emailUsuario = usuario.email_usuario || '';
            data.nombreUsuario = usuario.nombre_usuario || 'Cliente';
        }
    }

    return data;
}

/**
 * Envía un correo de confirmación de nueva reserva.
 */
export async function enviarEmailNuevaReserva(dataInput: ReservaEmailData) {
  try {
    const data = await completarDatosReserva(dataInput);

    if (!data.emailUsuario) {
        console.error('No se pudo obtener email para nueva reserva', dataInput);
        return { error: 'Falta email destinatario' };
    }

    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [data.emailUsuario],
      subject: `Reserva Confirmada #${data.idReserva} - GSD`,
      react: EmailTemplate({
        nombreUsuario: data.nombreUsuario || 'Cliente',
        mensaje: `Tu reserva ha sido creada exitosamente. Te esperamos en nuestras instalaciones.`,
        detalles: {
            instalacion: data.instalacion || '',
            fecha: data.fecha || '',
            monto: data.monto ? `$${data.monto}` : undefined,
            idReserva: data.idReserva
        },
        tipo: 'confirmacion'
      }) as React.ReactElement,
    });

    if (error) {
      console.error('Error enviando email nueva reserva:', error);
      return { error: error.message };
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('Error inesperado en email nueva reserva:', error);
    return { error: 'Error enviando email' };
  }
}

export async function enviarEmailCancelacion(dataInput: ReservaEmailData, motivo?: string) {
    try {
      const data = await completarDatosReserva(dataInput);
  
      if (!data.emailUsuario) return { error: 'Falta email destinatario' };

      const { data: result, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: [data.emailUsuario],
        subject: `Reserva Cancelada #${data.idReserva} - GSD`,
        react: EmailTemplate({
          nombreUsuario: data.nombreUsuario || 'Cliente',
          mensaje: `Tu reserva ha sido cancelada. ${motivo ? `Motivo: ${motivo}` : 'Si tienes dudas o crees que es un error, contáctanos.'}`,
          detalles: {
              instalacion: data.instalacion || '',
              fecha: data.fecha || '',
              idReserva: data.idReserva
          },
          tipo: 'cancelacion'
        }) as React.ReactElement,
      });
  
      if (error) {
        console.error('Error enviando email cancelacion:', error);
        return { error: error.message };
      }
  
      return { success: true, data: result };
    } catch (error) {
      console.error('Error inesperado en email cancelacion:', error);
      return { error: 'Error enviando email' };
    }
}

export async function enviarEmailPagoCompletado(dataInput: ReservaEmailData) {
    try {
        const data = await completarDatosReserva(dataInput);

        if (!data.emailUsuario) return { error: 'Falta email destinatario' };

        const { data: result, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [data.emailUsuario],
            subject: `Pago Recibido #${data.idReserva} - GSD`,
            react: EmailTemplate({
                nombreUsuario: data.nombreUsuario || 'Cliente',
                mensaje: `Hemos recibido tu pago correctamente. Tu reserva está asegurada.`,
                detalles: {
                    instalacion: data.instalacion || '',
                    fecha: data.fecha || '',
                    monto: data.monto ? `$${data.monto}` : undefined,
                    idReserva: data.idReserva
                },
                tipo: 'pago'
            }) as React.ReactElement,
        });

        if (error) {
            console.error('Error enviando email pago:', error);
            return { error: error.message };
        }
        return { success: true, data: result };
    } catch (error) {
        console.error('Error inesperado en email pago:', error);
        return { error: 'Error enviando email' };
    }
}

export async function enviarEmailInhabilitacion(dataInput: { idUsuario?: string, nombreUsuario?: string, emailUsuario?: string, fechaFin?: string }) {
    try {
        // Reutilizamos lógica básica de usuario
        let data: any = { ...dataInput };
        if (!data.emailUsuario && data.idUsuario) {
             const supabase = await createClient();
             const { data: user } = await supabase.from('usuarios').select('email_usuario, nombre_usuario').eq('id_usuario', data.idUsuario).single();
             if (user) {
                 data.emailUsuario = user.email_usuario;
                 data.nombreUsuario = user.nombre_usuario;
             }
        }

        if (!data.emailUsuario) return { error: 'Falta email destinatario' };

        const { data: result, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [data.emailUsuario],
            subject: `Cuenta Inhabilitada - GSD`,
            react: EmailTemplate({
                nombreUsuario: data.nombreUsuario || 'Cliente',
                mensaje: `Tu cuenta ha sido inhabilitada temporalmente debido a múltiples cancelaciones. Podrás volver a operar a partir del ${data.fechaFin}.`,
                tipo: 'inhabilitacion'
            }) as React.ReactElement,
        });

        if (error) {
            console.error('Error enviando email inhabilitacion:', error);
            return { error: error.message };
        }
        return { success: true, data: result };
    } catch (error) {
        console.error('Error inesperado en email inhabilitacion:', error);
        return { error: 'Error enviando email' };
    }
}

/**
 * Envía un aviso de eliminación de cuenta.
 */
export async function enviarEmailEliminacion(dataInput: { idUsuario?: string, nombreUsuario?: string, emailUsuario?: string }) {
    try {
        let data = { ...dataInput };
        if (!data.emailUsuario && data.idUsuario) {
             const supabase = await createClient();
             const { data: user } = await supabase.from('usuarios').select('email_usuario, nombre_usuario').eq('id_usuario', data.idUsuario).single();
             if (user) {
                 data.emailUsuario = user.email_usuario;
                 data.nombreUsuario = user.nombre_usuario;
             }
        }

        if (!data.emailUsuario) return { error: 'Falta email destinatario' };

        const { data: result, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [data.emailUsuario],
            subject: `Cuenta Eliminada - GSD`,
            react: EmailTemplate({
                nombreUsuario: data.nombreUsuario || 'Cliente',
                mensaje: `Lamentamos verte partir. Tu cuenta ha sido eliminada de nuestro sistema. Si quieres reingresar, contactanos.`,
                tipo: 'eliminacion'
            }) as React.ReactElement,
        });

        if (error) {
            console.error('Error enviando email eliminacion:', error);
            return { error: error.message };
        }
        return { success: true, data: result };
    } catch (error) {
        console.error('Error inesperado en email eliminacion:', error);
        return { error: 'Error enviando email' };
    }
}

export async function enviarEmailRecordatorioPago(dataInput: ReservaEmailData) {
    try {
        const data = await completarDatosReserva(dataInput);
        if (!data.emailUsuario) return { error: 'Falta email' };

        const { data: result, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [data.emailUsuario],
            subject: `Recordatorio de Pago Pendiente #${data.idReserva} - GSD`,
            react: EmailTemplate({
                nombreUsuario: data.nombreUsuario || 'Cliente',
                mensaje: `Tienes un pago pendiente para tu reserva que ha finalizado. Por favor, regulariza tu situación para evitar recargos.`,
                detalles: {
                    instalacion: data.instalacion || '',
                    fecha: data.fecha || '',
                    monto: data.monto ? `$${data.monto}` : undefined,
                    idReserva: data.idReserva
                },
                tipo: 'recordatorio'
            }) as React.ReactElement,
        });
        
        if (error) {
             console.error('Error enviando email recordatorio:', error);
             return { error: error.message };
        }
        return { success: true, data: result };
    } catch (error) {
        console.error('Email error:', error);
        return { error: 'Error interno' };
    }
}

export async function enviarEmailAvisoDeuda(dataInput: ReservaEmailData) {
    try {
        const data = await completarDatosReserva(dataInput);
        if (!data.emailUsuario) return { error: 'Falta email' };

        const { data: result, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [data.emailUsuario],
            subject: `Aviso de Infracción por Deuda #${data.idReserva} - GSD`,
            react: EmailTemplate({
                nombreUsuario: data.nombreUsuario || 'Cliente',
                mensaje: `Se ha generado una infracción por falta de pago. Tu cuenta ha sido inhabilitada hasta regularizar la deuda con los intereses correspondientes.`,
                detalles: {
                    instalacion: data.instalacion || '',
                    fecha: data.fecha || '',
                    monto: `Deuda Inicial: $${data.monto}`,
                    idReserva: data.idReserva
                },
                tipo: 'multa'
            }) as React.ReactElement,
        });

        if (error) {
             console.error('Error enviando email deuda:', error);
             return { error: error.message };
        }
        return { success: true, data: result };
    } catch (error) {
        console.error('Email error:', error);
        return { error: 'Error interno' };
    }
}
