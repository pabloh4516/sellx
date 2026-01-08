import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

// ============================================================================
// MÁSCARAS - Funções de formatação
// ============================================================================

// Máscara de CPF: 000.000.000-00
export function maskCPF(value) {
  if (!value) return '';
  const numbers = value.replace(/\D/g, '').slice(0, 11);
  return numbers
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

// Máscara de CNPJ: 00.000.000/0000-00
export function maskCNPJ(value) {
  if (!value) return '';
  const numbers = value.replace(/\D/g, '').slice(0, 14);
  return numbers
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

// Máscara de CPF ou CNPJ (detecta automaticamente)
export function maskCPFCNPJ(value) {
  if (!value) return '';
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 11) {
    return maskCPF(numbers);
  }
  return maskCNPJ(numbers);
}

// Máscara de telefone: (00) 00000-0000 ou (00) 0000-0000
export function maskPhone(value) {
  if (!value) return '';
  const numbers = value.replace(/\D/g, '').slice(0, 11);
  if (numbers.length <= 10) {
    return numbers
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  }
  return numbers
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}

// Máscara de CEP: 00000-000
export function maskCEP(value) {
  if (!value) return '';
  const numbers = value.replace(/\D/g, '').slice(0, 8);
  return numbers.replace(/(\d{5})(\d{1,3})$/, '$1-$2');
}

// Máscara de moeda: R$ 1.234,56
export function maskCurrency(value) {
  if (!value) return '';
  const numbers = value.replace(/\D/g, '');
  const amount = parseInt(numbers || '0', 10) / 100;
  return amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

// Máscara de data: 00/00/0000
export function maskDate(value) {
  if (!value) return '';
  const numbers = value.replace(/\D/g, '').slice(0, 8);
  return numbers
    .replace(/(\d{2})(\d)/, '$1/$2')
    .replace(/(\d{2})(\d)/, '$1/$2');
}

// Máscara de hora: 00:00
export function maskTime(value) {
  if (!value) return '';
  const numbers = value.replace(/\D/g, '').slice(0, 4);
  return numbers.replace(/(\d{2})(\d)/, '$1:$2');
}

// Máscara de cartão: 0000 0000 0000 0000
export function maskCard(value) {
  if (!value) return '';
  const numbers = value.replace(/\D/g, '').slice(0, 16);
  return numbers.replace(/(\d{4})(?=\d)/g, '$1 ');
}

// ============================================================================
// VALIDAÇÕES
// ============================================================================

export function validateCPF(cpf) {
  const numbers = cpf.replace(/\D/g, '');
  if (numbers.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(numbers)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(numbers[i]) * (10 - i);
  }
  let digit = (sum * 10) % 11;
  if (digit === 10) digit = 0;
  if (digit !== parseInt(numbers[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(numbers[i]) * (11 - i);
  }
  digit = (sum * 10) % 11;
  if (digit === 10) digit = 0;
  if (digit !== parseInt(numbers[10])) return false;

  return true;
}

export function validateCNPJ(cnpj) {
  const numbers = cnpj.replace(/\D/g, '');
  if (numbers.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(numbers)) return false;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(numbers[i]) * weights1[i];
  }
  let digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (digit !== parseInt(numbers[12])) return false;

  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(numbers[i]) * weights2[i];
  }
  digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (digit !== parseInt(numbers[13])) return false;

  return true;
}

export function validatePhone(phone) {
  const numbers = phone.replace(/\D/g, '');
  return numbers.length >= 10 && numbers.length <= 11;
}

export function validateCEP(cep) {
  const numbers = cep.replace(/\D/g, '');
  return numbers.length === 8;
}

// ============================================================================
// COMPONENTE MASKED INPUT
// ============================================================================

const masks = {
  cpf: maskCPF,
  cnpj: maskCNPJ,
  cpfcnpj: maskCPFCNPJ,
  phone: maskPhone,
  cep: maskCEP,
  currency: maskCurrency,
  date: maskDate,
  time: maskTime,
  card: maskCard,
};

const validators = {
  cpf: validateCPF,
  cnpj: validateCNPJ,
  cpfcnpj: (value) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.length <= 11 ? validateCPF(value) : validateCNPJ(value);
  },
  phone: validatePhone,
  cep: validateCEP,
};

const MaskedInput = React.forwardRef(({
  mask,
  value,
  onChange,
  onBlur,
  validate = true,
  className,
  ...props
}, ref) => {
  const [error, setError] = React.useState(false);

  const maskFn = masks[mask];
  const validateFn = validators[mask];

  const handleChange = (e) => {
    const rawValue = e.target.value;
    const maskedValue = maskFn ? maskFn(rawValue) : rawValue;

    // Criar evento sintético com valor mascarado
    const syntheticEvent = {
      ...e,
      target: {
        ...e.target,
        value: maskedValue,
        rawValue: rawValue.replace(/\D/g, ''), // Valor apenas números
      },
    };

    setError(false);
    onChange?.(syntheticEvent);
  };

  const handleBlur = (e) => {
    if (validate && validateFn && e.target.value) {
      const isValid = validateFn(e.target.value);
      setError(!isValid);
    }
    onBlur?.(e);
  };

  const displayValue = maskFn ? maskFn(value || '') : (value || '');

  return (
    <Input
      ref={ref}
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      className={cn(
        error && "border-destructive focus-visible:ring-destructive",
        className
      )}
      {...props}
    />
  );
});

MaskedInput.displayName = "MaskedInput";

// ============================================================================
// COMPONENTES ESPECÍFICOS
// ============================================================================

export const CPFInput = React.forwardRef((props, ref) => (
  <MaskedInput ref={ref} mask="cpf" placeholder="000.000.000-00" {...props} />
));
CPFInput.displayName = "CPFInput";

export const CNPJInput = React.forwardRef((props, ref) => (
  <MaskedInput ref={ref} mask="cnpj" placeholder="00.000.000/0000-00" {...props} />
));
CNPJInput.displayName = "CNPJInput";

export const CPFCNPJInput = React.forwardRef((props, ref) => (
  <MaskedInput ref={ref} mask="cpfcnpj" placeholder="CPF ou CNPJ" {...props} />
));
CPFCNPJInput.displayName = "CPFCNPJInput";

export const PhoneInput = React.forwardRef((props, ref) => (
  <MaskedInput ref={ref} mask="phone" placeholder="(00) 00000-0000" {...props} />
));
PhoneInput.displayName = "PhoneInput";

export const CEPInput = React.forwardRef((props, ref) => (
  <MaskedInput ref={ref} mask="cep" placeholder="00000-000" {...props} />
));
CEPInput.displayName = "CEPInput";

export const CurrencyInput = React.forwardRef((props, ref) => (
  <MaskedInput ref={ref} mask="currency" placeholder="R$ 0,00" {...props} />
));
CurrencyInput.displayName = "CurrencyInput";

export const DateInput = React.forwardRef((props, ref) => (
  <MaskedInput ref={ref} mask="date" placeholder="00/00/0000" {...props} />
));
DateInput.displayName = "DateInput";

export { MaskedInput };
export default MaskedInput;
