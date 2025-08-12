import React, { useState, useEffect } from 'react';
import { Input } from './input';

interface CurrencyInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  'data-testid'?: string;
}

export function CurrencyInput({
  value,
  onChange,
  placeholder = "0.00",
  className = "",
  id,
  'data-testid': dataTestId
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState('');

  // Format number with commas
  const formatNumber = (num: string): string => {
    // Remove all non-numeric characters except decimal point
    const numericOnly = num.replace(/[^0-9.]/g, '');
    
    // Handle decimal places
    const parts = numericOnly.split('.');
    const wholePart = parts[0];
    const decimalPart = parts[1];
    
    // Add commas to whole number part
    const formattedWhole = wholePart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    // Reconstruct the number
    if (decimalPart !== undefined) {
      return `${formattedWhole}.${decimalPart}`;
    }
    
    return formattedWhole;
  };

  // Remove formatting for storage
  const unformatNumber = (formattedNum: string): string => {
    return formattedNum.replace(/[^0-9.]/g, '');
  };

  // Update display value when external value changes
  useEffect(() => {
    if (value !== undefined && value !== null) {
      const numericValue = unformatNumber(value.toString());
      setDisplayValue(numericValue ? formatNumber(numericValue) : '');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const numericValue = unformatNumber(inputValue);
    
    // Update display with formatted value
    setDisplayValue(formatNumber(inputValue));
    
    // Send unformatted value to parent
    onChange(numericValue);
  };

  return (
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
      data-testid={dataTestId}
    />
  );
}