import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, Star, Gift, TrendingUp, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoyaltyDisplay({ customerPoints, loyaltyProgram, earnedPoints = 0 }) {
  if (!loyaltyProgram) return null;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const currentPoints = customerPoints?.points_balance || 0;
  const totalAfterSale = currentPoints + earnedPoints;
  const pointsValue = currentPoints * loyaltyProgram.reais_per_point;
  const earnedValue = earnedPoints * loyaltyProgram.reais_per_point;

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 shadow-lg">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-md">
                <Award className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-amber-900 text-sm">Programa Fidelidade</p>
                <p className="text-xs text-amber-700">{loyaltyProgram.name}</p>
              </div>
            </div>
            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
              <Star className="w-3 h-3 mr-1" />
              VIP
            </Badge>
          </div>

          {/* Points Display */}
          <div className="bg-white/80 backdrop-blur rounded-xl p-3 mb-3 border border-amber-200">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs text-slate-600 mb-0.5">Saldo Atual</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-black text-amber-600">{currentPoints}</p>
                  <p className="text-sm text-amber-700 font-semibold">pontos</p>
                </div>
                <p className="text-xs text-green-600 font-medium mt-1">
                  = {formatCurrency(pointsValue)} em crédito
                </p>
              </div>
              <div className="text-right">
                <Sparkles className="w-8 h-8 text-amber-400 mb-1" />
              </div>
            </div>
          </div>

          {/* Earning This Sale */}
          {earnedPoints > 0 && (
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg p-3 mb-3 border border-green-300"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-xs text-green-700 font-semibold">Ganhe nesta venda</p>
                    <p className="text-2xl font-bold text-green-600">+{earnedPoints} pts</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-green-600">+ {formatCurrency(earnedValue)}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Total After Sale */}
          {earnedPoints > 0 && (
            <div className="bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg p-2 border border-blue-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-blue-600" />
                  <p className="text-xs text-blue-700 font-semibold">Saldo após venda</p>
                </div>
                <p className="text-lg font-bold text-blue-600">{totalAfterSale} pts</p>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="mt-3 pt-3 border-t border-amber-200">
            <p className="text-xs text-amber-800 text-center">
              A cada R$ 1,00 = {loyaltyProgram.points_per_real} ponto | 
              {' '}1 ponto = {formatCurrency(loyaltyProgram.reais_per_point)}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}