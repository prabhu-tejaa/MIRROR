import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  private readonly secretKey: "mirror_secret_key_123" = 'mirror_secret_key_123';

  private encrypt(value: string): string {
    let result: string = '';
    for (let i: number = 0; i < value.length; i++) {
      result += String.fromCharCode(value.charCodeAt(i) ^ this.secretKey.charCodeAt(i % this.secretKey.length));
    }
    return btoa(result);
  }

  private decrypt(value: string): string {
    let result: string = '';
    try {
      const decoded: string = atob(value);
      for (let i: number = 0; i < decoded.length; i++) {
        result += String.fromCharCode(decoded.charCodeAt(i) ^ this.secretKey.charCodeAt(i % this.secretKey.length));
      }
      return result;
    } catch {
      return value;
    }
  }

  public get(key: string): string | null {
    if (typeof localStorage === 'undefined') {return null;}
    const value: string | null = localStorage.getItem(key);
    if (!value) {return null;}
    return this.decrypt(value);
  }

  public set(key: string, value: string): void {
    if (typeof localStorage === 'undefined') {return;}
    localStorage.setItem(key, this.encrypt(value));
  }

  public remove(key: string): void {
    if (typeof localStorage === 'undefined') {return;}
    localStorage.removeItem(key);
  }

  public clear(): void {
    if (typeof localStorage === 'undefined') {return;}
    localStorage.clear();
  }
}
