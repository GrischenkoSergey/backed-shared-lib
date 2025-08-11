import ContextStorageService from '../interfaces/context-storage.service';
import { CLS_ID, ClsService } from 'nestjs-cls';
import { Injectable } from '@nestjs/common';

@Injectable()
export default class NestjsClsContextStorageService implements ContextStorageService {
  constructor(private readonly cls: ClsService) { }

  public get<T>(key: string): T {
    return this.cls.get(key);
  }

  public setContextId(id: string) {
    this.cls.set(CLS_ID, id);
  }

  public getContextId(): string {
    return this.cls.getId();
  }

  public set<T>(key: string, value: T): void {
    this.cls.set(key, value);
  }
}
