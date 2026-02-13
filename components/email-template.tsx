
import * as React from 'react';

interface EmailTemplateProps {
    nombreUsuario: string;
    mensaje: string;
    detalles?: {
        instalacion: string;
        fecha: string;
        monto?: string;
        idReserva?: number;
    };
    tipo: 'confirmacion' | 'cancelacion' | 'pago' | 'info' | 'inhabilitacion' | 'recordatorio' | 'multa' | 'eliminacion';
}

export const EmailTemplate: React.FC<Readonly<EmailTemplateProps>> = ({
    nombreUsuario,
    mensaje,
    detalles,
    tipo,
}) => {
    const colorHeader = {
        confirmacion: '#16a34a', // green-600
        cancelacion: '#dc2626', // red-600
        pago: '#2563eb', // blue-600
        info: '#4b5563', // gray-600
        inhabilitacion: '#ea580c', // orange-600 warning
        recordatorio: '#eab308', // yellow-500 warning light
        multa: '#b91c1c', // red-700 severe
        eliminacion: '#000000', // black
    }[tipo] || '#4b5563';

    return (
        <div style={{ fontFamily: 'sans-serif', padding: '20px', color: '#333' }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>

                {/* Header */}
                <div style={{ backgroundColor: colorHeader, padding: '20px', textAlign: 'center' }}>
                    <h1 style={{ color: '#ffffff', margin: 0, fontSize: '24px' }}>
                        {tipo === 'confirmacion' ? 'Reserva Confirmada' :
                            tipo === 'cancelacion' ? 'Reserva Cancelada' :
                                tipo === 'pago' ? 'Pago Recibido' :
                                    tipo === 'inhabilitacion' ? 'Cuenta Inhabilitada' :
                                        tipo === 'multa' ? 'Aviso de Infracción' :
                                            tipo === 'recordatorio' ? 'Recordatorio de Pago' :
                                                tipo === 'eliminacion' ? 'Cuenta Eliminada' : 'Notificación'}
                    </h1>
                </div>

                {/* Body */}
                <div style={{ padding: '30px' }}>
                    <p style={{ fontSize: '16px', lineHeight: '1.5' }}>Hola <strong>{nombreUsuario}</strong>,</p>
                    <p style={{ fontSize: '16px', lineHeight: '1.5' }}>{mensaje}</p>

                    {detalles && (
                        <div style={{ backgroundColor: '#f9fafb', padding: '15px', borderRadius: '6px', marginTop: '20px' }}>
                            <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#111827' }}>Detalles:</h3>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                {detalles.instalacion && (
                                    <li style={{ padding: '5px 0' }}><strong>Instalación:</strong> {detalles.instalacion}</li>
                                )}
                                {detalles.fecha && (
                                    <li style={{ padding: '5px 0' }}><strong>Fecha y Hora:</strong> {detalles.fecha}</li>
                                )}
                                {detalles.monto && (
                                    <li style={{ padding: '5px 0' }}><strong>Monto:</strong> {detalles.monto}</li>
                                )}
                                {detalles.idReserva && (
                                    <li style={{ padding: '5px 0' }}><strong>ID Reserva:</strong> #{detalles.idReserva}</li>
                                )}
                            </ul>
                        </div>
                    )}

                    <div style={{ marginTop: '30px', borderTop: '1px solid #e5e7eb', paddingTop: '20px', fontSize: '14px', color: '#6b7280' }}>
                        <p>Gracias por confiar en nosotros.</p>
                        <p>Si tienes dudas, contáctanos.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};