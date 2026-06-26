import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiError, toApiError } from '../../../core/api/models/api-error.models';
import { PageInfo, ViewStatus } from '../../public-games/models/public-game.models';
import { createIdempotencyKey } from '../../player-commerce/utils/player-commerce-display';
import { AdminOrderApiDto, AdminPaymentDetailApiDto, AdminPaymentListApiDto } from '../models/admin-commerce.models';
import { ADMIN_COMMERCE_REPOSITORY } from './admin-commerce.repository';

const initialPage: PageInfo={currentPage:1,lastPage:1,perPage:20,total:0};
@Injectable() export class AdminOrdersFacade {
  private readonly repo=inject(ADMIN_COMMERCE_REPOSITORY);private readonly destroyRef=inject(DestroyRef);
  readonly orders=signal<AdminOrderApiDto[]>([]);readonly pageInfo=signal<PageInfo>(initialPage);readonly status=signal<ViewStatus>('idle');readonly error=signal<ApiError|null>(null);readonly statusFilter=signal('');readonly gameFilter=signal('');readonly hasPreviousPage=computed(()=>this.pageInfo().currentPage>1);readonly hasNextPage=computed(()=>this.pageInfo().currentPage<this.pageInfo().lastPage);
  load(page=1,status=this.statusFilter(),gameId=this.gameFilter()){this.status.set('loading');this.error.set(null);this.statusFilter.set(status);this.gameFilter.set(gameId.trim());this.repo.listOrders(page,status||undefined,gameId.trim()||undefined).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({next:r=>{this.orders.set(r.data);this.pageInfo.set({currentPage:r.meta.current_page,lastPage:r.meta.last_page,perPage:r.meta.per_page,total:r.meta.total});this.status.set(r.data.length?'success':'empty');},error:(e:unknown)=>{this.orders.set([]);this.error.set(toApiError(e));this.status.set('error');}});}
  previousPage(){if(this.hasPreviousPage())this.load(this.pageInfo().currentPage-1);} nextPage(){if(this.hasNextPage())this.load(this.pageInfo().currentPage+1);}
}
@Injectable() export class AdminPaymentsFacade {
  private readonly repo=inject(ADMIN_COMMERCE_REPOSITORY);private readonly destroyRef=inject(DestroyRef);
  readonly payments=signal<AdminPaymentListApiDto[]>([]);readonly pageInfo=signal<PageInfo>(initialPage);readonly status=signal<ViewStatus>('idle');readonly error=signal<ApiError|null>(null);readonly filter=signal('');readonly hasPreviousPage=computed(()=>this.pageInfo().currentPage>1);readonly hasNextPage=computed(()=>this.pageInfo().currentPage<this.pageInfo().lastPage);
  load(page=1,status=this.filter()){this.status.set('loading');this.error.set(null);this.filter.set(status);this.repo.listPayments(page,status||undefined).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({next:r=>{this.payments.set(r.data);this.pageInfo.set({currentPage:r.meta.current_page,lastPage:r.meta.last_page,perPage:r.meta.per_page,total:r.meta.total});this.status.set(r.data.length?'success':'empty');},error:(e:unknown)=>{this.payments.set([]);this.error.set(toApiError(e));this.status.set('error');}});}
  previousPage(){if(this.hasPreviousPage())this.load(this.pageInfo().currentPage-1);} nextPage(){if(this.hasNextPage())this.load(this.pageInfo().currentPage+1);}
}
@Injectable() export class AdminPaymentDetailFacade {
  private readonly repo=inject(ADMIN_COMMERCE_REPOSITORY);private readonly destroyRef=inject(DestroyRef);private approveKey=createIdempotencyKey('approve-payment');private rejectKey=createIdempotencyKey('reject-payment');
  readonly payment=signal<AdminPaymentDetailApiDto|null>(null);readonly status=signal<ViewStatus>('idle');readonly error=signal<ApiError|null>(null);readonly actionStatus=signal<'idle'|'saving'|'success'|'error'>('idle');readonly actionError=signal<ApiError|null>(null);
  load(id:string){this.status.set('loading');this.error.set(null);this.repo.getPayment(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({next:p=>{this.payment.set(p);this.status.set('success');},error:(e:unknown)=>{this.error.set(toApiError(e));this.status.set('error');}});}
  approve(notes:string){const p=this.payment();if(!p||this.actionStatus()==='saving')return;this.actionStatus.set('saving');this.actionError.set(null);this.repo.approvePayment(p.id,notes.trim()||null,this.approveKey).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({next:()=>{this.approveKey=createIdempotencyKey('approve-payment');this.actionStatus.set('success');this.load(p.id);},error:(e:unknown)=>{this.actionError.set(toApiError(e));this.actionStatus.set('error');}});}
  reject(reason:string){const p=this.payment();if(!p||this.actionStatus()==='saving')return;this.actionStatus.set('saving');this.actionError.set(null);this.repo.rejectPayment(p.id,reason.trim(),this.rejectKey).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({next:()=>{this.rejectKey=createIdempotencyKey('reject-payment');this.actionStatus.set('success');this.load(p.id);},error:(e:unknown)=>{this.actionError.set(toApiError(e));this.actionStatus.set('error');}});}
}