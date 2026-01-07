import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';

export default function A4ReceiptPrint({ sale, company, customer, operator, onClose }) {
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
          .receipt-a4, .receipt-a4 * {
            visibility: visible;
          }
          .receipt-a4 {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm;
            padding: 15mm;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="receipt-a4 max-w-4xl mx-auto bg-white p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 pb-6 border-b-2">
          <div className="flex items-center gap-4">
            {company?.logo_url && (
              <img src={company.logo_url} alt="Logo" className="h-24 object-contain" />
            )}
            <div>
              <h1 className="text-2xl font-bold">{company?.trade_name || company?.name || 'EMPRESA'}</h1>
              {company?.cnpj && <p className="text-sm">CNPJ: {company.cnpj}</p>}
              {company?.address && <p className="text-sm">{company.address}</p>}
              {company?.city && <p className="text-sm">{company.city}/{company.state} - CEP: {company.zip_code}</p>}
              {company?.phone && <p className="text-sm">Tel: {company.phone}</p>}
              {company?.email && <p className="text-sm">Email: {company.email}</p>}
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold">NOTA DE VENDA</h2>
            <p className="text-lg font-mono">Nº {sale.sale_number}</p>
            <p className="text-sm">{format(new Date(sale.sale_date || sale.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
            {operator && <p className="text-sm mt-2">Vendedor: {operator}</p>}
          </div>
        </div>

        {/* Customer */}
        {customer && (
          <div className="mb-6 p-4 bg-slate-50 rounded">
            <h3 className="font-semibold mb-2">CLIENTE</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p><strong>Nome:</strong> {customer.name}</p>
              {customer.cpf_cnpj && <p><strong>CPF/CNPJ:</strong> {customer.cpf_cnpj}</p>}
              {customer.address && <p><strong>Endereço:</strong> {customer.address}</p>}
              {customer.city && <p><strong>Cidade:</strong> {customer.city}/{customer.state}</p>}
              {customer.phone && <p><strong>Telefone:</strong> {customer.phone}</p>}
              {customer.email && <p><strong>Email:</strong> {customer.email}</p>}
            </div>
          </div>
        )}

        {/* Items */}
        <div className="mb-6">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="border p-2 text-left">PRODUTO</th>
                <th className="border p-2 text-center">QTD</th>
                <th className="border p-2 text-right">UNIT.</th>
                <th className="border p-2 text-right">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {sale.items?.map((item, index) => (
                <tr key={index}>
                  <td className="border p-2">{item.product_name}</td>
                  <td className="border p-2 text-center">{item.quantity}</td>
                  <td className="border p-2 text-right">{formatCurrency(item.unit_price)}</td>
                  <td className="border p-2 text-right font-medium">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-80 space-y-2">
            <div className="flex justify-between text-lg">
              <span>Subtotal:</span>
              <span>{formatCurrency(sale.subtotal)}</span>
            </div>
            
            {sale.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Desconto:</span>
                <span>-{formatCurrency(sale.discount)}</span>
              </div>
            )}
            
            <div className="flex justify-between text-2xl font-bold border-t-2 pt-2">
              <span>TOTAL:</span>
              <span className="text-blue-600">{formatCurrency(sale.total)}</span>
            </div>
          </div>
        </div>

        {/* Payments */}
        {sale.payments && sale.payments.length > 0 && (
          <div className="mb-8 p-4 bg-slate-50 rounded">
            <h3 className="font-semibold mb-3">FORMA DE PAGAMENTO</h3>
            <div className="space-y-2">
              {sale.payments.map((payment, index) => (
                <div key={index} className="flex justify-between">
                  <span>{payment.method_name} {payment.installments > 1 ? `(${payment.installments}x)` : ''}</span>
                  <span className="font-medium">{formatCurrency(payment.amount)}</span>
                </div>
              ))}
              {/* Troco */}
              {(() => {
                const totalPaid = sale.payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
                const change = totalPaid - (sale.total || 0);
                if (change > 0.01) {
                  return (
                    <div className="flex justify-between pt-3 mt-3 border-t-2 border-dashed">
                      <span className="font-bold text-lg">TROCO:</span>
                      <span className="font-bold text-lg text-green-600">{formatCurrency(change)}</span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 pt-6 border-t-2">
          <p className="text-lg font-semibold mb-2">OBRIGADO PELA PREFERÊNCIA!</p>
          <p className="text-sm text-slate-600">VOLTE SEMPRE!</p>
          {company?.website && <p className="text-sm text-slate-500 mt-2">{company.website}</p>}
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
          Imprimir Nota A4
        </Button>
      </div>
    </>
  );
}