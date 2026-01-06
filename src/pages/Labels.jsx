import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Search, Printer, Tag, Package, Eye, Plus, Minus, X } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import {
  PageContainer,
  PageHeader,
  CardSection,
  Grid,
  MiniMetric,
} from '@/components/nexo';

const LABEL_FORMATS = [
  { value: 'pimaco-6080', label: 'Pimaco 6080 (80 etiquetas)', cols: 4, rows: 20, width: 48.5, height: 25.4, marginTop: 21.2, marginLeft: 8.2, gapX: 0, gapY: 0 },
  { value: 'pimaco-6081', label: 'Pimaco 6081 (65 etiquetas)', cols: 5, rows: 13, width: 38.1, height: 21.2, marginTop: 10.7, marginLeft: 8.2, gapX: 0, gapY: 0 },
  { value: 'pimaco-6082', label: 'Pimaco 6082 (33 etiquetas)', cols: 3, rows: 11, width: 63.5, height: 25.4, marginTop: 12.7, marginLeft: 6.4, gapX: 0, gapY: 0 },
  { value: 'pimaco-6083', label: 'Pimaco 6083 (44 etiquetas)', cols: 4, rows: 11, width: 46.5, height: 25.4, marginTop: 12.7, marginLeft: 9.7, gapX: 0, gapY: 0 },
  { value: 'pimaco-6180', label: 'Pimaco 6180 (100 etiquetas)', cols: 5, rows: 20, width: 38.1, height: 12.7, marginTop: 21.2, marginLeft: 10.7, gapX: 0, gapY: 0 },
  { value: 'custom-small', label: 'Pequena (126 etiquetas)', cols: 7, rows: 18, width: 26, height: 13, marginTop: 10, marginLeft: 10, gapX: 2, gapY: 2 },
  { value: 'custom-medium', label: 'Media (80 etiquetas)', cols: 5, rows: 16, width: 36, height: 15, marginTop: 10, marginLeft: 10, gapX: 2, gapY: 2 },
  { value: 'custom-large', label: 'Grande (40 etiquetas)', cols: 4, rows: 10, width: 45, height: 25, marginTop: 10, marginLeft: 10, gapX: 2, gapY: 2 },
];

export default function Labels() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]); // Array of { product, quantity }
  const [labelFormat, setLabelFormat] = useState('pimaco-6082');
  const [showPrice, setShowPrice] = useState(true);
  const [showBarcode, setShowBarcode] = useState(true);
  const [showCode, setShowCode] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [fontSize, setFontSize] = useState('normal'); // small, normal, large
  const printRef = useRef(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const productsData = await base44.entities.Product.filter({ is_active: true });
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const addProduct = (product) => {
    const existing = selectedProducts.find(p => p.product.id === product.id);
    if (existing) {
      setSelectedProducts(selectedProducts.map(p =>
        p.product.id === product.id ? { ...p, quantity: p.quantity + 1 } : p
      ));
    } else {
      setSelectedProducts([...selectedProducts, { product, quantity: 1 }]);
    }
  };

  const removeProduct = (productId) => {
    setSelectedProducts(selectedProducts.filter(p => p.product.id !== productId));
  };

  const updateQuantity = (productId, delta) => {
    setSelectedProducts(selectedProducts.map(p => {
      if (p.product.id === productId) {
        const newQty = Math.max(1, p.quantity + delta);
        return { ...p, quantity: newQty };
      }
      return p;
    }));
  };

  const setQuantity = (productId, qty) => {
    const quantity = Math.max(1, parseInt(qty) || 1);
    setSelectedProducts(selectedProducts.map(p =>
      p.product.id === productId ? { ...p, quantity } : p
    ));
  };

  const getTotalLabels = () => {
    return selectedProducts.reduce((sum, p) => sum + p.quantity, 0);
  };

  const generateBarcodeSVG = (code, width = 100, height = 30) => {
    if (!code) return '';

    try {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      JsBarcode(svg, code, {
        format: 'CODE128',
        width: 1,
        height: height,
        displayValue: false,
        margin: 0,
      });
      return svg.outerHTML;
    } catch (error) {
      // Try EAN13 if CODE128 fails
      try {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        JsBarcode(svg, code, {
          format: 'EAN13',
          width: 1,
          height: height,
          displayValue: false,
          margin: 0,
        });
        return svg.outerHTML;
      } catch {
        return '';
      }
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const getFormat = () => LABEL_FORMATS.find(f => f.value === labelFormat) || LABEL_FORMATS[2];

  const getFontSizeClass = () => {
    switch (fontSize) {
      case 'small': return { name: '6px', price: '8px', code: '5px' };
      case 'large': return { name: '10px', price: '12px', code: '7px' };
      default: return { name: '8px', price: '10px', code: '6px' };
    }
  };

  const handlePrint = () => {
    if (selectedProducts.length === 0) {
      toast.error('Selecione ao menos um produto');
      return;
    }
    setShowPreview(true);
  };

  const executePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Popup bloqueado! Permita popups para imprimir.');
      return;
    }

    const format = getFormat();
    const fontSizes = getFontSizeClass();

    // Generate all labels
    let labelsHtml = '';
    selectedProducts.forEach(({ product, quantity }) => {
      for (let i = 0; i < quantity; i++) {
        const barcodeValue = product.barcode || product.code || product.id;
        const barcodeSvg = showBarcode ? generateBarcodeSVG(barcodeValue, 60, 20) : '';

        labelsHtml += `
          <div class="label">
            <div class="product-name" style="font-size: ${fontSizes.name};">${product.name}</div>
            ${showCode ? `<div class="product-code" style="font-size: ${fontSizes.code};">Cod: ${product.code || '-'}</div>` : ''}
            ${showBarcode && barcodeSvg ? `<div class="barcode">${barcodeSvg}</div>` : ''}
            ${showBarcode ? `<div class="barcode-number" style="font-size: ${fontSizes.code};">${barcodeValue}</div>` : ''}
            ${showPrice ? `<div class="product-price" style="font-size: ${fontSizes.price};">${formatCurrency(product.sale_price)}</div>` : ''}
          </div>
        `;
      }
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Etiquetas - Sellx</title>
        <style>
          @page {
            size: A4;
            margin: 0;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, sans-serif;
            padding: ${format.marginTop}mm ${format.marginLeft}mm;
          }
          .labels-container {
            display: grid;
            grid-template-columns: repeat(${format.cols}, ${format.width}mm);
            gap: ${format.gapY}mm ${format.gapX}mm;
          }
          .label {
            width: ${format.width}mm;
            height: ${format.height}mm;
            padding: 1mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            overflow: hidden;
            border: 0.1mm solid #eee;
          }
          .product-name {
            font-weight: bold;
            line-height: 1.1;
            max-height: 2.2em;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            margin-bottom: 1px;
          }
          .product-code {
            color: #666;
            margin-bottom: 1px;
          }
          .barcode {
            margin: 1px 0;
          }
          .barcode svg {
            max-width: ${format.width - 4}mm;
            height: auto;
          }
          .barcode-number {
            font-family: monospace;
            color: #333;
          }
          .product-price {
            font-weight: bold;
            color: #000;
            margin-top: 1px;
          }
          @media print {
            .label {
              border: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="labels-container">
          ${labelsHtml}
        </div>
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();

    setShowPreview(false);
    toast.success('Etiquetas enviadas para impressao!');
  };

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.barcode?.includes(searchTerm)
  );

  const format = getFormat();
  const fontSizes = getFontSizeClass();

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Impressao de Etiquetas"
        subtitle={`${getTotalLabels()} etiquetas para imprimir`}
        icon={Tag}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPreview(true)}
              disabled={selectedProducts.length === 0}
            >
              <Eye className="w-4 h-4 mr-2" />
              Visualizar
            </Button>
            <Button
              onClick={handlePrint}
              disabled={selectedProducts.length === 0}
            >
              <Printer className="w-4 h-4 mr-2" />
              Imprimir Etiquetas
            </Button>
          </div>
        }
      />

      {/* Metricas */}
      <Grid cols={4}>
        <MiniMetric
          label="Total de Produtos"
          value={products.length}
          icon={Package}
        />
        <MiniMetric
          label="Produtos Selecionados"
          value={selectedProducts.length}
          icon={Tag}
          status={selectedProducts.length > 0 ? 'success' : 'default'}
        />
        <MiniMetric
          label="Total de Etiquetas"
          value={getTotalLabels()}
          icon={Printer}
          status={getTotalLabels() > 0 ? 'success' : 'default'}
        />
        <MiniMetric
          label="Paginas Estimadas"
          value={Math.ceil(getTotalLabels() / (format.cols * format.rows))}
          icon={Tag}
        />
      </Grid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration */}
        <CardSection>
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Configuracoes
          </h3>

          <div className="space-y-4">
            <div>
              <Label>Formato da Etiqueta</Label>
              <Select value={labelFormat} onValueChange={setLabelFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LABEL_FORMATS.map(format => (
                    <SelectItem key={format.value} value={format.value}>
                      {format.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {format.cols}x{format.rows} = {format.cols * format.rows} etiquetas por folha
              </p>
            </div>

            <div>
              <Label>Tamanho da Fonte</Label>
              <Select value={fontSize} onValueChange={setFontSize}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Pequena</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="large">Grande</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Informacoes na Etiqueta</Label>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="showCode"
                  checked={showCode}
                  onCheckedChange={setShowCode}
                />
                <Label htmlFor="showCode" className="cursor-pointer">Codigo do produto</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="showBarcode"
                  checked={showBarcode}
                  onCheckedChange={setShowBarcode}
                />
                <Label htmlFor="showBarcode" className="cursor-pointer">Codigo de barras</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="showPrice"
                  checked={showPrice}
                  onCheckedChange={setShowPrice}
                />
                <Label htmlFor="showPrice" className="cursor-pointer">Preco de venda</Label>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="border-t border-border pt-4 mt-4">
            <Label className="mb-2 block">Pre-visualizacao</Label>
            <div
              className="border-2 border-dashed border-border rounded p-3 bg-white text-center space-y-1"
              style={{
                width: `${Math.min(format.width * 3, 180)}px`,
                minHeight: '80px',
                margin: '0 auto'
              }}
            >
              <p className="font-bold text-gray-900" style={{ fontSize: fontSizes.name }}>
                Nome do Produto Exemplo
              </p>
              {showCode && (
                <p className="text-gray-500" style={{ fontSize: fontSizes.code }}>
                  Cod: PROD001
                </p>
              )}
              {showBarcode && (
                <>
                  <div
                    className="barcode-preview mx-auto"
                    dangerouslySetInnerHTML={{ __html: generateBarcodeSVG('7891234567890', 80, 25) }}
                  />
                  <p className="font-mono text-gray-600" style={{ fontSize: fontSizes.code }}>
                    7891234567890
                  </p>
                </>
              )}
              {showPrice && (
                <p className="font-bold text-green-600" style={{ fontSize: fontSizes.price }}>
                  R$ 99,90
                </p>
              )}
            </div>
          </div>

          {/* Selected Products */}
          {selectedProducts.length > 0 && (
            <div className="border-t border-border pt-4 mt-4">
              <Label className="mb-2 block">Produtos Selecionados ({selectedProducts.length})</Label>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {selectedProducts.map(({ product, quantity }) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{product.name}</p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => updateQuantity(product.id, -1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <Input
                          type="number"
                          value={quantity}
                          onChange={(e) => setQuantity(product.id, e.target.value)}
                          className="w-12 h-6 text-center text-xs p-1"
                          min="1"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => updateQuantity(product.id, 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive"
                          onClick={() => removeProduct(product.id)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </CardSection>

        {/* Product Selection */}
        <div className="lg:col-span-2">
          <CardSection>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, codigo ou codigo de barras..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {filteredProducts.map(product => {
                    const isSelected = selectedProducts.some(p => p.product.id === product.id);
                    const selectedQty = selectedProducts.find(p => p.product.id === product.id)?.quantity || 0;

                    return (
                      <div
                        key={product.id}
                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-muted/50'
                        }`}
                        onClick={() => addProduct(product)}
                      >
                        <div className="flex-1">
                          <p className="font-medium">{product.name}</p>
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            {product.code && <span>Cod: {product.code}</span>}
                            {product.barcode && <span>Barras: {product.barcode}</span>}
                            <span className="font-bold text-success">{formatCurrency(product.sale_price)}</span>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                              {selectedQty} etiqueta{selectedQty > 1 ? 's' : ''}
                            </span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                addProduct(product);
                              }}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </CardSection>
        </div>
      </div>

      {/* Print Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Pre-visualizacao das Etiquetas</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {getTotalLabels()} etiquetas em {Math.ceil(getTotalLabels() / (format.cols * format.rows))} pagina(s)
              </p>
              <Button onClick={executePrint}>
                <Printer className="w-4 h-4 mr-2" />
                Imprimir Agora
              </Button>
            </div>

            <div
              ref={printRef}
              className="bg-white border rounded-lg p-4 overflow-auto"
              style={{ minHeight: '400px' }}
            >
              <div
                className="grid gap-1 mx-auto"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(format.cols, 5)}, ${format.width * 2.5}px)`,
                  maxWidth: '100%',
                }}
              >
                {selectedProducts.flatMap(({ product, quantity }) =>
                  Array.from({ length: Math.min(quantity, 20) }, (_, i) => {
                    const barcodeValue = product.barcode || product.code || product.id;
                    return (
                      <div
                        key={`${product.id}-${i}`}
                        className="border border-gray-300 p-2 text-center flex flex-col items-center justify-center bg-white"
                        style={{
                          width: `${format.width * 2.5}px`,
                          height: `${format.height * 2.5}px`,
                          fontSize: '10px',
                        }}
                      >
                        <p className="font-bold text-gray-900 leading-tight line-clamp-2" style={{ fontSize: fontSizes.name }}>
                          {product.name}
                        </p>
                        {showCode && (
                          <p className="text-gray-500" style={{ fontSize: fontSizes.code }}>
                            {product.code || '-'}
                          </p>
                        )}
                        {showBarcode && (
                          <>
                            <div
                              className="my-1"
                              dangerouslySetInnerHTML={{ __html: generateBarcodeSVG(barcodeValue, 60, 18) }}
                            />
                            <p className="font-mono text-gray-600" style={{ fontSize: fontSizes.code }}>
                              {barcodeValue}
                            </p>
                          </>
                        )}
                        {showPrice && (
                          <p className="font-bold text-green-600" style={{ fontSize: fontSizes.price }}>
                            {formatCurrency(product.sale_price)}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              {getTotalLabels() > 20 * selectedProducts.length && (
                <p className="text-center text-muted-foreground mt-4 text-sm">
                  Mostrando apenas as primeiras 20 etiquetas de cada produto na pre-visualizacao...
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
