import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';

export default function ReceiptPrint({ sale, company, customer, operator, onClose }) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .receipt-print, .receipt-print * {
            visibility: visible;
          }
          .receipt-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="receipt-print font-mono text-sm p-4 max-w-[80mm] mx-auto bg-white">
        {/* Header */}
        <div className="text-center mb-4 border-b-2 border-dashed pb-4">
          {company?.logo_url && (
            <img src={company.logo_url} alt="Logo" className="h-16 mx-auto mb-2" />
          )}
          <h2 className="font-bold text-lg">{company?.trade_name || company?.name || 'EMPRESA'}</h2>
          {company?.cnpj && <p className="text-xs">CNPJ: {company.cnpj}</p>}
          {company?.address && <p className="text-xs">{company.address}</p>}
          {company?.city && <p className="text-xs">{company.city}/{company.state}</p>}
          {company?.phone && <p className="text-xs">Tel: {company.phone}</p>}
        </div>

        {/* Sale Info */}
        <div className="text-center mb-4 border-b border-dashed pb-2">
          <p className="font-bold">CUPOM NÃO FISCAL</p>
          <p className="text-xs">Venda #{sale.sale_number}</p>
          <p className="text-xs">{format(new Date(sale.sale_date || sale.created_date), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</p>
        </div>

        {/* Customer & Operator */}
        <div className="mb-4 border-b border-dashed pb-2">
          {customer && (
            <>
              <p className="text-xs">Cliente: {customer.name}</p>
              {customer.cpf_cnpj && <p className="text-xs">CPF/CNPJ: {customer.cpf_cnpj}</p>}
            </>
          )}
          {operator && <p className="text-xs">Vendedor: {operator}</p>}
        </div>

        {/* Items */}
        <div className="mb-4">
          <div className="border-b border-dashed pb-1 mb-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="flex-1">PRODUTO</span>
              <span className="w-12 text-center">QTD</span>
              <span className="w-16 text-right">UNIT</span>
              <span className="w-16 text-right">TOTAL</span>
            </div>
          </div>

          {sale.items?.map((item, index) => (
            <div key={index} className="mb-2">
              <div className="flex justify-between text-xs">
                <span className="flex-1 font-medium">{item.product_name}</span>
                <span className="w-12 text-center">{item.quantity}</span>
                <span className="w-16 text-right">{formatCurrency(item.unit_price)}</span>
                <span className="w-16 text-right font-bold">{formatCurrency(item.total)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="border-t-2 border-dashed pt-2 mb-4">
          <div className="flex justify-between mb-1">
            <span>SUBTOTAL:</span>
            <span>{formatCurrency(sale.subtotal)}</span>
          </div>
          
          {sale.discount > 0 && (
            <div className="flex justify-between mb-1 text-xs">
              <span>DESCONTO:</span>
              <span>-{formatCurrency(sale.discount)}</span>
            </div>
          )}
          
          <div className="flex justify-between font-bold text-base border-t border-dashed pt-2">
            <span>TOTAL:</span>
            <span>{formatCurrency(sale.total)}</span>
          </div>
        </div>

        {/* Payments */}
        {sale.payments && sale.payments.length > 0 && (
          <div className="mb-4 border-t border-dashed pt-2">
            <p className="text-xs font-bold mb-2">FORMA DE PAGAMENTO:</p>
            {sale.payments.map((payment, index) => (
              <div key={index} className="flex justify-between text-xs mb-1">
                <span>{payment.method_name} {payment.installments > 1 ? `${payment.installments}x` : ''}</span>
                <span>{formatCurrency(payment.amount)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs mt-6 border-t-2 border-dashed pt-4">
          <p className="font-bold mb-2">OBRIGADO PELA PREFERÊNCIA!</p>
          <p>VOLTE SEMPRE!</p>
          {company?.website && <p className="mt-2">{company.website}</p>}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="no-print flex justify-center gap-4 mt-6 pb-6">
        <Button onClick={onClose} variant="outline">
          <X className="w-4 h-4 mr-2" />
          Fechar
        </Button>
        <Button onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" />
          Imprimir Cupom
        </Button>
      </div>
    </>
  );
}