import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Camera, CameraOff, SwitchCamera, X, Flashlight, ZoomIn, ZoomOut } from 'lucide-react';
import { playSound } from '@/utils/beep';
import { toast } from 'sonner';

// Formatos de codigo de barras suportados
const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
];

export default function CameraScanner({ open, onOpenChange, onScan }) {
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState('');
  const [error, setError] = useState('');
  const scannerRef = useRef(null);
  const containerRef = useRef(null);

  // Obtem lista de cameras disponiveis
  useEffect(() => {
    if (open) {
      Html5Qrcode.getCameras()
        .then((devices) => {
          if (devices && devices.length > 0) {
            setCameras(devices);
            // Preferir camera traseira (environment)
            const backCamera = devices.find(
              (d) => d.label.toLowerCase().includes('back') ||
                     d.label.toLowerCase().includes('traseira') ||
                     d.label.toLowerCase().includes('environment')
            );
            setSelectedCamera(backCamera?.id || devices[0].id);
          } else {
            setError('Nenhuma camera encontrada');
          }
        })
        .catch((err) => {
          console.error('Erro ao obter cameras:', err);
          setError('Erro ao acessar cameras. Verifique as permissoes.');
        });
    }
  }, [open]);

  // Inicia/para o scanner quando abre/fecha o dialog
  useEffect(() => {
    if (open && selectedCamera && !isScanning) {
      startScanner();
    }

    return () => {
      stopScanner();
    };
  }, [open, selectedCamera]);

  const startScanner = async () => {
    if (!selectedCamera || isScanning) return;

    try {
      setError('');

      // Cria instancia do scanner
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('camera-scanner-container', {
          formatsToSupport: SUPPORTED_FORMATS,
          verbose: false,
        });
      }

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 150 },
        aspectRatio: 1.777778,
        disableFlip: false,
      };

      await scannerRef.current.start(
        selectedCamera,
        config,
        handleScanSuccess,
        handleScanError
      );

      setIsScanning(true);
    } catch (err) {
      console.error('Erro ao iniciar scanner:', err);
      setError('Erro ao iniciar camera. Tente novamente.');
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        setIsScanning(false);
      } catch (err) {
        console.error('Erro ao parar scanner:', err);
      }
    }
  };

  const handleScanSuccess = useCallback((decodedText, decodedResult) => {
    // Evita leituras duplicadas em sequencia
    if (decodedText === lastScanned) return;

    setLastScanned(decodedText);

    // Toca som de confirmacao
    playSound('scan');

    // Feedback visual
    toast.success(`Codigo lido: ${decodedText}`);

    // Chama callback
    onScan(decodedText);

    // Limpa o ultimo escaneado apos 2 segundos (permite escanear o mesmo codigo novamente)
    setTimeout(() => setLastScanned(''), 2000);
  }, [lastScanned, onScan]);

  const handleScanError = (errorMessage) => {
    // Ignora erros de "nao encontrado" (normal durante a varredura)
    if (errorMessage?.includes('No MultiFormat Readers')) return;
    if (errorMessage?.includes('NotFoundException')) return;
  };

  const handleCameraChange = async (cameraId) => {
    await stopScanner();
    setSelectedCamera(cameraId);
  };

  const handleClose = async () => {
    await stopScanner();
    onOpenChange(false);
  };

  // Troca entre cameras
  const switchCamera = async () => {
    if (cameras.length <= 1) return;

    const currentIndex = cameras.findIndex((c) => c.id === selectedCamera);
    const nextIndex = (currentIndex + 1) % cameras.length;
    await handleCameraChange(cameras[nextIndex].id);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            Scanner de Codigo de Barras
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-4 space-y-4">
          {/* Seletor de Camera */}
          {cameras.length > 1 && (
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Select value={selectedCamera} onValueChange={handleCameraChange}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecionar camera" />
                  </SelectTrigger>
                  <SelectContent>
                    {cameras.map((camera) => (
                      <SelectItem key={camera.id} value={camera.id}>
                        {camera.label || `Camera ${cameras.indexOf(camera) + 1}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="icon" onClick={switchCamera} title="Trocar camera">
                <SwitchCamera className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Area do Scanner */}
          <div className="relative bg-black rounded-xl overflow-hidden">
            <div
              id="camera-scanner-container"
              ref={containerRef}
              className="w-full aspect-video"
            />

            {/* Overlay com guia de posicionamento */}
            {isScanning && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-64 h-24 border-2 border-primary rounded-lg relative">
                    <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-primary rounded-tl" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-primary rounded-tr" />
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-primary rounded-bl" />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-primary rounded-br" />

                    {/* Linha de scan animada */}
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-primary animate-scan" />
                  </div>
                </div>
              </div>
            )}

            {/* Erro */}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                <div className="text-center p-4">
                  <CameraOff className="w-12 h-12 text-destructive mx-auto mb-2" />
                  <p className="text-white text-sm">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={startScanner}
                  >
                    Tentar novamente
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Ultimo codigo lido */}
          {lastScanned && (
            <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
              <p className="text-sm text-muted-foreground">Ultimo codigo lido:</p>
              <p className="font-mono font-bold text-lg">{lastScanned}</p>
            </div>
          )}

          {/* Instrucoes */}
          <div className="text-center text-sm text-muted-foreground">
            <p>Posicione o codigo de barras dentro da area marcada</p>
            <p className="text-xs mt-1">Suporta: EAN-13, EAN-8, UPC, Code 128, QR Code e outros</p>
          </div>

          {/* Botao Fechar */}
          <Button variant="outline" className="w-full" onClick={handleClose}>
            <X className="w-4 h-4 mr-2" />
            Fechar Scanner
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Componente de botao para abrir o scanner
export function CameraScannerButton({ onScan, className }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className={className}
        onClick={() => setOpen(true)}
        title="Abrir scanner de camera"
      >
        <Camera className="w-4 h-4" />
      </Button>

      <CameraScanner open={open} onOpenChange={setOpen} onScan={onScan} />
    </>
  );
}
