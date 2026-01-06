/**
 * Sistema de sons para o PDV
 * Utiliza Web Audio API para gerar beeps sem precisar de arquivos externos
 */

let audioContext = null;

// Inicializa o AudioContext (necessario apos interacao do usuario)
const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
};

/**
 * Gera um beep usando Web Audio API
 * @param {number} frequency - Frequencia em Hz (padrao: 800)
 * @param {number} duration - Duracao em ms (padrao: 100)
 * @param {number} volume - Volume de 0 a 1 (padrao: 0.3)
 * @param {string} type - Tipo de onda: 'sine', 'square', 'triangle', 'sawtooth' (padrao: 'sine')
 */
export const beep = (frequency = 800, duration = 100, volume = 0.3, type = 'sine') => {
  try {
    const ctx = getAudioContext();

    // Resume context if suspended (necessario em alguns navegadores)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;
    gainNode.gain.value = volume;

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration / 1000);

    // Fade out para evitar click no final
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);
  } catch (error) {
    console.warn('Beep nao suportado:', error);
  }
};

// Sons pre-definidos para o PDV
export const sounds = {
  // Som de sucesso - beep agudo curto
  success: () => beep(1200, 80, 0.25, 'sine'),

  // Som de produto adicionado - dois beeps rapidos
  productAdded: () => {
    beep(900, 60, 0.2, 'sine');
    setTimeout(() => beep(1100, 80, 0.25, 'sine'), 70);
  },

  // Som de erro - beep grave mais longo
  error: () => beep(300, 200, 0.3, 'square'),

  // Som de alerta/aviso - beep medio
  warning: () => beep(600, 150, 0.25, 'triangle'),

  // Som de venda finalizada - sequencia ascendente
  saleComplete: () => {
    beep(800, 80, 0.2, 'sine');
    setTimeout(() => beep(1000, 80, 0.2, 'sine'), 100);
    setTimeout(() => beep(1200, 120, 0.25, 'sine'), 200);
  },

  // Som de scan - beep classico de leitor
  scan: () => beep(1000, 100, 0.3, 'sine'),

  // Som de caixa registradora
  cashRegister: () => {
    beep(800, 50, 0.2, 'sine');
    setTimeout(() => beep(1000, 50, 0.2, 'sine'), 60);
    setTimeout(() => beep(1200, 100, 0.25, 'sine'), 120);
  },

  // Som de notificacao
  notification: () => {
    beep(880, 100, 0.15, 'sine');
    setTimeout(() => beep(988, 100, 0.15, 'sine'), 120);
  },

  // Som de tecla
  keypress: () => beep(600, 30, 0.1, 'sine'),
};

// Funcao para verificar se som esta habilitado nas configuracoes
export const isSoundEnabled = () => {
  try {
    const settings = JSON.parse(localStorage.getItem('systemSettings') || '{}');
    return settings.pdvSoundEnabled !== false;
  } catch {
    return true;
  }
};

// Funcao para tocar som apenas se estiver habilitado
export const playSound = (soundName) => {
  if (isSoundEnabled() && sounds[soundName]) {
    sounds[soundName]();
  }
};

export default sounds;
