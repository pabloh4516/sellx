import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

export default function ServiceOrderPrint({ serviceOrder, company, customer, onClose }) {
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
          .os-print, .os-print * {
            visibility: visible;
          }
          .os-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm;
            padding: 10mm;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="os-print max-w-4xl mx-auto bg-white p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 pb-4 border-b-2">
          <div className="flex items-center gap-4">
            {company?.logo_url && (
              <img src={company.logo_url} alt="Logo" className="h-20 object-contain" />
            )}
            <div>
              <h1 className="text-lg font-bold">{company?.trade_name || company?.name || 'EMPRESA'}</h1>
              <p className="text-xs">{company?.address}</p>
              <p className="text-xs">{company?.city}/{company?.state} - CEP: {company?.zip_code}</p>
              <p className="text-xs">Tel: {company?.phone}</p>
            </div>
          </div>
          <div className="text-right border-2 border-slate-300 p-3">
            <h2 className="text-xl font-bold">Ordem Serviço</h2>
            <p className="text-3xl font-bold">{serviceOrder.order_number || 1}</p>
          </div>
        </div>

        {/* Dates and Responsible */}
        <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
          <div className="border p-2">
            <strong>Data Entrada:</strong>
            <p className="text-lg">{format(new Date(serviceOrder.entry_date || serviceOrder.created_date), 'dd/MM/yyyy')}</p>
          </div>
          <div className="border p-2 text-center">
            <strong>Responsável:</strong>
            <p>{serviceOrder.created_by || 'Administrador'}</p>
          </div>
          <div className="border p-2 text-right">
            <strong>Data Saída:</strong>
            <p className="text-lg">
              {serviceOrder.completion_date ? format(new Date(serviceOrder.completion_date), 'dd/MM/yyyy') : '___/___/___'}
            </p>
          </div>
        </div>

        {/* Customer and Equipment Info */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <p><strong>Cliente:</strong> {customer?.name || 'CLIENTE PADRÃO'}</p>
            <p><strong>Endereço:</strong> {customer?.address || '- - -'}</p>
            <p><strong>Produto:</strong> {serviceOrder.equipment_type} {serviceOrder.brand} {serviceOrder.model}</p>
            <p><strong>Nº Série / Imei:</strong> {serviceOrder.serial_number}</p>
          </div>
          <div>
            <p><strong>CPF/CNPJ:</strong> {customer?.cpf_cnpj}</p>
            <p><strong>Telefone:</strong> {customer?.phone}</p>
            <p><strong>Tipo Prod.:</strong> {serviceOrder.equipment_type}</p>
          </div>
        </div>

        {/* Checklist */}
        {serviceOrder.checklist && serviceOrder.checklist.length > 0 && (
          <div className="mb-4">
            <div className="grid grid-cols-6 gap-2 text-xs">
              {serviceOrder.checklist.map((item, index) => (
                <div key={index} className="flex items-center gap-1">
                  <input type="checkbox" checked={item.checked} readOnly className="h-3 w-3" />
                  <span>{item.item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Problem, Diagnosis, Solution */}
        <div className="grid grid-cols-1 gap-3 mb-4 text-sm">
          <div className="border">
            <div className="bg-slate-200 px-2 py-1 font-bold">Problema:</div>
            <div className="p-2 min-h-[40px]">{serviceOrder.problem_description}</div>
          </div>
          <div className="border">
            <div className="bg-slate-200 px-2 py-1 font-bold">Laudo:</div>
            <div className="p-2 min-h-[40px]">{serviceOrder.diagnosis || ''}</div>
          </div>
          <div className="border">
            <div className="bg-slate-200 px-2 py-1 font-bold">Observações:</div>
            <div className="p-2 min-h-[40px]">{serviceOrder.internal_notes || ''}</div>
          </div>
        </div>

        {/* Services and Parts */}
        <div className="mb-4">
          <h3 className="font-bold mb-2 text-sm">Serviços a Executar/Executados:</h3>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100">
                <th className="border p-1 text-left">Cód. Produto</th>
                <th className="border p-1 text-left">Descrição</th>
                <th className="border p-1 text-center">Un</th>
                <th className="border p-1 text-center">Qtd.</th>
                <th className="border p-1 text-right">Preço Venda</th>
                <th className="border p-1 text-right">Desc.</th>
                <th className="border p-1 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {serviceOrder.services?.map((service, index) => (
                <tr key={index}>
                  <td className="border p-1">{index + 1}</td>
                  <td className="border p-1">{service.description}</td>
                  <td className="border p-1 text-center">SV</td>
                  <td className="border p-1 text-center">1,00</td>
                  <td className="border p-1 text-right">{formatCurrency(service.price)}</td>
                  <td className="border p-1 text-right">R$ 0,00</td>
                  <td className="border p-1 text-right">{formatCurrency(service.price)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan="6" className="border p-1 text-right font-bold">Subtotal Serviços:</td>
                <td className="border p-1 text-right font-bold">{formatCurrency(serviceOrder.labor_cost)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mb-4">
          <h3 className="font-bold mb-2 text-sm">Peças e Acessórios:</h3>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100">
                <th className="border p-1 text-left">Cód. Produto</th>
                <th className="border p-1 text-left">Descrição</th>
                <th className="border p-1 text-center">Un</th>
                <th className="border p-1 text-center">Qtd.</th>
                <th className="border p-1 text-right">Preço Venda</th>
                <th className="border p-1 text-right">Desc.</th>
                <th className="border p-1 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {serviceOrder.parts?.map((part, index) => (
                <tr key={index}>
                  <td className="border p-1">{part.product_id?.substring(0, 6)}</td>
                  <td className="border p-1">{part.name}</td>
                  <td className="border p-1 text-center">UN</td>
                  <td className="border p-1 text-center">{part.quantity}</td>
                  <td className="border p-1 text-right">{formatCurrency(part.price)}</td>
                  <td className="border p-1 text-right">R$ 0,00</td>
                  <td className="border p-1 text-right">{formatCurrency(part.price * part.quantity)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan="6" className="border p-1 text-right font-bold">Subtotal Produtos:</td>
                <td className="border p-1 text-right font-bold">{formatCurrency(serviceOrder.parts_cost)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payments and Totals */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="border p-3 text-sm">
            <h3 className="font-bold mb-2">Entrada/Sinal:</h3>
            {serviceOrder.payments?.map((payment, index) => (
              <div key={index} className="flex justify-between">
                <span>PGTO {index + 1}: {payment.type?.toUpperCase()}</span>
                <span className="font-bold">{formatCurrency(payment.amount)}</span>
              </div>
            ))}
            <div className="border-t mt-2 pt-2 flex justify-between font-bold">
              <span>Total Pago:</span>
              <span>{formatCurrency(serviceOrder.paid_amount)}</span>
            </div>
            <div className="mt-4">
              <strong>Status OS:</strong> <span className="ml-2">{serviceOrder.status}</span>
            </div>
          </div>

          <div className="text-sm space-y-2">
            <div className="flex justify-between text-lg">
              <span className="font-bold">Total bruto:</span>
              <span className="font-bold">{formatCurrency(serviceOrder.total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Desconto:</span>
              <span className="font-bold text-blue-600">R$ 0,00</span>
            </div>
            <div className="flex justify-between text-xl border-t-2 pt-2">
              <span className="font-bold">Total líquido:</span>
              <span className="font-bold text-blue-600">{formatCurrency(serviceOrder.total)}</span>
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8 mt-8 pt-6 border-t-2">
          <div className="text-center">
            <div className="border-t-2 border-slate-800 pt-2 mt-12">
              <p className="text-sm font-medium">Ass. do Responsável</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t-2 border-slate-800 pt-2 mt-12">
              <p className="text-sm font-medium">Ass. do Cliente</p>
            </div>
          </div>
        </div>

        {/* Warranty Text */}
        <div className="mt-6 text-[9px] text-justify text-slate-600 leading-tight">
          <p>
            Garantimos por 90 dias que todos os serviços executados e peças vendidas por nossa assistência técnica sejam realizados de acordo
            com as normas de qualidade exigidas e que estejam em boas condições. Durante o período de garantia, nossa equipe técnica se
            responsabilizará por dar suporte ao cliente por meio de soluções de manutenção, realizando todos os serviços necessários para
            reparar ou substituir as peças apresentando defeitos de fabricação. Caso os itens não possam ser consertados, ofereceremos a
            devolução do valor investido ou a substituição dos produtos por peças novas e dentro do prazo de garantia.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="no-print flex justify-center gap-4 mt-6 pb-6">
        <Button onClick={onClose} variant="outline">
          Fechar
        </Button>
        <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
          <Printer className="w-4 h-4 mr-2" />
          Imprimir OS
        </Button>
      </div>
    </>
  );
}