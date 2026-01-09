import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CreditCard, Clock, Lock } from 'lucide-react';
import { useSubscriptionBlock } from '@/hooks/useSubscriptionBlock';

/**
 * Modal de aviso de bloqueio por inadimplencia
 */
export function SubscriptionBlockModal({ open, onClose, featureName }) {
  const navigate = useNavigate();
  const { getBlockInfo } = useSubscriptionBlock();
  const blockInfo = getBlockInfo();

  const handleGoToPayment = () => {
    onClose();
    navigate('/Subscription');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-amber-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <DialogTitle className="text-xl">
              {blockInfo.title || 'Assinatura Pendente'}
            </DialogTitle>
          </div>
          <DialogDescription className="text-base pt-2">
            {blockInfo.message || 'Regularize sua assinatura para continuar usando o sistema.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Feature que tentou acessar */}
          {featureName && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Lock className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">Funcao bloqueada</p>
                <p className="text-sm text-gray-500">{featureName}</p>
              </div>
            </div>
          )}

          {/* Dias em atraso */}
          {blockInfo.showDaysOverdue && blockInfo.daysOverdue > 0 && (
            <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
              <Clock className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-red-700">Tempo em atraso</p>
                <p className="text-sm text-red-600">
                  {blockInfo.daysOverdue} {blockInfo.daysOverdue === 1 ? 'dia' : 'dias'}
                </p>
              </div>
            </div>
          )}

          {/* Status do periodo */}
          {blockInfo.isInGracePeriod && (
            <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-sm font-medium text-amber-700">Periodo de tolerancia</p>
                <p className="text-sm text-amber-600">
                  Regularize antes do bloqueio total
                </p>
              </div>
            </div>
          )}

          {blockInfo.isTotallyBlocked && (
            <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
              <Lock className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-700">Sistema bloqueado</p>
                <p className="text-sm text-red-600">
                  Regularize urgentemente para voltar a usar
                </p>
              </div>
            </div>
          )}

          {/* Plano atual */}
          {blockInfo.plan && (
            <div className="text-center py-2">
              <p className="text-sm text-gray-500">Seu plano</p>
              <p className="font-semibold text-gray-700 capitalize">{blockInfo.plan}</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Fechar
          </Button>
          {blockInfo.showPayButton !== false && (
            <Button onClick={handleGoToPayment} className="w-full sm:w-auto gap-2">
              <CreditCard className="h-4 w-4" />
              Regularizar Assinatura
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook para facilitar o uso do modal de bloqueio
 */
export function useBlockedFeatureModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [blockedFeatureName, setBlockedFeatureName] = useState('');
  const { isFeatureBlocked } = useSubscriptionBlock();
  const { BLOCKABLE_FEATURES } = require('@/hooks/useSubscriptionBlock');

  /**
   * Verifica se uma feature esta bloqueada e abre o modal se estiver
   * @param {string} featureId - ID da feature
   * @returns {boolean} - true se bloqueada (modal aberto), false se liberada
   */
  const checkAndBlock = (featureId) => {
    if (isFeatureBlocked(featureId)) {
      const featureInfo = BLOCKABLE_FEATURES[featureId];
      setBlockedFeatureName(featureInfo?.label || featureId);
      setIsOpen(true);
      return true;
    }
    return false;
  };

  const closeModal = () => {
    setIsOpen(false);
    setBlockedFeatureName('');
  };

  return {
    isOpen,
    blockedFeatureName,
    checkAndBlock,
    closeModal,
    ModalComponent: () => (
      <SubscriptionBlockModal
        open={isOpen}
        onClose={closeModal}
        featureName={blockedFeatureName}
      />
    ),
  };
}

export default SubscriptionBlockModal;
