import { AbstractControl, ValidationErrors } from '@angular/forms';

export function strictPasswordValidator(control: AbstractControl): ValidationErrors | null {
  const value: string = control.value || '';

  if (!value) {return null;}

  const errors: ValidationErrors = {};

  if (!/[A-Z]/.test(value)) {errors['missingUpper'] = true;}
  if (!/[a-z]/.test(value)) {errors['missingLower'] = true;}
  if (!/[0-9]/.test(value)) {errors['missingNumeric'] = true;}
  if (!/[@$!%*?&]/.test(value)) {errors['missingSpecial'] = true;}

  return Object.keys(errors).length > 0 ? errors : null;
}
