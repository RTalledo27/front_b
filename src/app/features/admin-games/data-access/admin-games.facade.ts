import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { ApiError, toApiError } from '../../../core/api/models/api-error.models';
import { AdminGameApiDto, AdminGameNumberApiDto, CreateAdminGameDto } from '../models/admin-games.models';
import { ADMIN_GAMES_REPOSITORY } from './admin-games.repository';
@Injectable() export class AdminGamesFacade {
  private readonly repo=inject(ADMIN_GAMES_REPOSITORY);private readonly destroyRef=inject(DestroyRef);
  readonly game=signal<AdminGameApiDto|null>(null);readonly numbers=signal<AdminGameNumberApiDto[]>([]);readonly busy=signal(false);readonly error=signal<ApiError|null>(null);readonly message=signal('');
  create(data:CreateAdminGameDto){this.run(this.repo.create(data),'Bingo creado correctamente.');}
  transition(id:string,action:'publish'|'open-sales'|'close-sales',message:string){if(!id.trim())return;this.run(this.repo.transition(id.trim(),action),message);}
  schedule(id:string,date:string){if(!id.trim()||!date)return;this.run(this.repo.schedule(id.trim(),new Date(date).toISOString()),'Bingo programado.');}
  cancel(id:string,reason:string){if(!id.trim())return;this.run(this.repo.cancel(id.trim(),reason.trim()||null),'Bingo cancelado.');}
  loadNumbers(id:string){if(!id.trim())return;this.busy.set(true);this.error.set(null);this.repo.numbers(id.trim()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({next:n=>{this.numbers.set(n);this.busy.set(false);this.message.set(`${n.length} números cargados.`);},error:(e:unknown)=>{this.error.set(toApiError(e));this.busy.set(false);}});}
  private run(request:Observable<AdminGameApiDto>,message:string){this.busy.set(true);this.error.set(null);this.message.set('');request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({next:g=>{this.game.set(g);this.busy.set(false);this.message.set(message);},error:(e:unknown)=>{this.error.set(toApiError(e));this.busy.set(false);}});}
}