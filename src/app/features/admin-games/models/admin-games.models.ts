import { GameStatus, MoneyApiDto } from '../../../core/api/models/game-api.models';
export interface AdminGameApiDto {
  id:string;slug:string;name:string;description:string|null;status:GameStatus;
  number_range:{min:number;max:number;hits_required:number};ticket_price:MoneyApiDto;prize:MoneyApiDto;
  schedule:{sales_opens_at:string|null;sales_closes_at:string|null;scheduled_start_at:string|null;draw_interval_seconds:number;auto_draw_enabled:boolean};
  settings:unknown;created_by:number|null;created_at:string|null;updated_at:string|null;
}
export interface CreateAdminGameDto {
  slug:string;name:string;description:string|null;number_min:number;number_max:number;hits_required:number;
  ticket_price_cents:number;prize_cents:number;currency:string;draw_interval_seconds:number;auto_draw_enabled:boolean;
  sales_opens_at:string|null;sales_closes_at:string|null;scheduled_start_at:string|null;settings:null;
}
export interface AdminGameNumberApiDto {
  id:string;number:number;status:string;
  active_reservation:{id:string;order_id:string;user_id:number|null;order_status:string|null;expires_at:string|null}|null;
  sold_entry:{id:string;user_id:number;user_name:string|null;status:string;confirmed_at:string|null}|null;
}