import { IsUserLockedPipe } from './is-user-locked-pipe';

describe('IsUserLockedPipe', () => {
  it('create an instance', () => {
    const pipe = new IsUserLockedPipe();
    expect(pipe).toBeTruthy();
  });
});
