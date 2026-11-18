import { describe, expect, it } from 'vitest';

import reducer, { clearToken, setPages, updateToken } from './AnimationSlice';
import { UIBranch } from '../models/UIBranch';

describe('AnimationSlice page and token reducers', () => {
  it('updates the token and page fields through Redux Toolkit draft mutations', () => {
    const token = setTimeout(() => {}, 0);

    const state = reducer(
      undefined,
      updateToken({ token, currentPage: UIBranch.libraries }),
    );

    expect(state.identifier).toBe(token);
    expect(state.previousPage).toBe(UIBranch.homepage);
    expect(state.currentPage).toBe(UIBranch.libraries);

    clearTimeout(token);
  });

  it('clears the stored token', () => {
    const token = setTimeout(() => {}, 0);

    const withToken = reducer(
      undefined,
      updateToken({ token, currentPage: undefined }),
    );
    const cleared = reducer(withToken, clearToken());

    expect(cleared.identifier).toBeNull();

    clearTimeout(token);
  });

  it('tracks the previous page when setting the current page', () => {
    const state = reducer(undefined, setPages(UIBranch.contact));

    expect(state.previousPage).toBe(UIBranch.homepage);
    expect(state.currentPage).toBe(UIBranch.contact);
  });
});
