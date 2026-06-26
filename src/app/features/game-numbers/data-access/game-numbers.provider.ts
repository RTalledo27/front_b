import { Provider } from '@angular/core';
import { GAME_NUMBERS_REPOSITORY } from './game-numbers.repository';
import { HttpGameNumbersRepository } from './http-game-numbers.repository';

export const provideGameNumbersRepository = (): Provider => ({
  provide: GAME_NUMBERS_REPOSITORY,
  useClass: HttpGameNumbersRepository,
});