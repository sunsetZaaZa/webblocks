import { describe, expect, it } from 'vitest';

import reducer, { clearToken, setPages, updateToken } from './AnimationSlice';
import { MendCharacterStats, mendWithConstant } from '../models/CharacterStats';
import { AnimationBoundingShape, MovementDirection } from '../models/AnimationStats';
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


describe('Character preset completion', () => {
  it('fills missing required nested values even with an empty custom preset', () => {
    const result = MendCharacterStats({}, {});
    expect(result.movement).toEqual(mendWithConstant.movement);
    expect(result.sizes).toEqual({ width: 0, height: 0 });
    expect(result.movement?.boundingBox).not.toBe(mendWithConstant.movement?.boundingBox);
  });

  it('preserves explicit dimensions, zero values and movement fields', () => {
    const movement = {
      xInterval: 7, yInterval: 0,
      directionOne: MovementDirection.right, directionTwo: MovementDirection.static,
      boundingBox: { xBound: 120, yBound: 0, xOrigin: 4, yOrigin: 5, shape: AnimationBoundingShape.rectangle },
      rotateDegree: 0, xRate: 2, yRate: 0,
    };
    const result = MendCharacterStats({ movement, sizes: { width: 0, height: 32 }, attachedTo: null });
    expect(result.movement).toEqual(movement);
    expect(result.sizes).toEqual({ width: 0, height: 32 });
    expect(result.attachedTo).toBeNull();
    expect(result.movement?.boundingBox).not.toBe(movement.boundingBox);
  });
});
