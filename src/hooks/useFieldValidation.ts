import { useState, useCallback } from 'react';

type Rules<T extends string> = Partial<Record<T, (v: string) => string | undefined>>;

export function useFieldValidation<T extends string>(rules: Rules<T>) {
  const [errors, setErrors] = useState<Partial<Record<T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<T, boolean>>>({});

  const touch = useCallback((field: T) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  }, []);

  const validate = useCallback((field: T, value: string) => {
    const rule = rules[field];
    const error = rule ? rule(value) : undefined;
    setErrors(prev => ({ ...prev, [field]: error }));
    return !error;
  }, [rules]);

  const validateAll = useCallback((values: Partial<Record<T, string>>): boolean => {
    const newErrors: Partial<Record<T, string>> = {};
    const newTouched: Partial<Record<T, boolean>> = {};
    let valid = true;
    for (const field of Object.keys(rules) as T[]) {
      const rule = rules[field];
      newTouched[field] = true;
      const error = rule ? rule(values[field] || '') : undefined;
      if (error) { newErrors[field] = error; valid = false; }
    }
    setErrors(newErrors);
    setTouched(newTouched);
    return valid;
  }, [rules]);

  const reset = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  const fieldProps = useCallback((field: T, value: string) => ({
    onBlur: () => { touch(field); validate(field, value); },
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (touched[field]) validate(field, e.target.value);
    },
  }), [touch, validate, touched]);

  return { errors, touched, touch, validate, validateAll, reset, fieldProps };
}
