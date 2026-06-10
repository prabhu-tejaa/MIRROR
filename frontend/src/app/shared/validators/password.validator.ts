import { AbstractControl, ValidationErrors } from '@angular/forms';

const hasUpper: RegExp = /[A-Z]/;
const hasLower: RegExp = /[a-z]/;
const hasNumeric: RegExp = /\d/;
const hasSpecial: RegExp = /[@$!%*?&]/;

function validatePassword(value: string): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!hasUpper.test(value)) { errors['missingUpper'] = true; }
  if (!hasLower.test(value)) { errors['missingLower'] = true; }
  if (!hasNumeric.test(value)) { errors['missingNumeric'] = true; }
  if (!hasSpecial.test(value)) { errors['missingSpecial'] = true; }
  return errors;
}

export function strictPasswordValidator(control: AbstractControl): ValidationErrors | null {
  const value: string = (control.value as string | null | undefined) ?? '';
  if (!value) {
    return null;
  }
  const errors: ValidationErrors = validatePassword(value);
  return Object.keys(errors).length > 0 ? errors : null;
}
