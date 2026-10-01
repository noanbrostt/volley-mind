import { ATTACK_CONTROLLED_SPEED_MPS } from '@config/touch';
import { Vec3 } from '@core/vec3';
import { type AthleteState, createAthlete } from '@domain/athlete/athlete-state';
import { contactPoint } from '@domain/athlete/contact-point';
import { describe, expect, it } from 'vitest';
import { touchTargetFor } from './touch-target';

const receiver = createAthlete({ id: 'b', basePosition: Vec3.create(0, 0, 3), facing: Math.PI });

describe('touchTargetFor', () => {
  it('sets above the attacker, where they hit with the arm stretched up', () => {
    const target = touchTargetFor('set', 'overhead', receiver);
    expect(target.point).toEqual(contactPoint(receiver, 'spike'));
    expect(target.trajectory.kind).toBe('arc');
  });

  it('digs high to the setter’s hands', () => {
    const target = touchTargetFor('dig', 'bump', receiver);
    expect(target.point).toEqual(contactPoint(receiver, 'overhead'));
    expect(target.trajectory.kind).toBe('arc');
  });

  it('attacks the defender at bump height: driven for a spike, an arc for a roll shot', () => {
    const spike = touchTargetFor('attack', 'spike', receiver);
    expect(spike.point).toEqual(contactPoint(receiver, 'bump'));
    expect(spike.trajectory).toEqual({ kind: 'drive', speed: ATTACK_CONTROLLED_SPEED_MPS });
    expect(touchTargetFor('attack', 'roll-shot', receiver).trajectory.kind).toBe('arc');
  });

  it('aims at the receiver’s base, even while they walk back to it after fetching a ball', () => {
    const walkingBack: AthleteState = {
      ...receiver,
      position: Vec3.create(1.2, 0, 2.4),
      velocity: Vec3.create(-1, 0, 0.5),
    };
    expect(touchTargetFor('set', 'overhead', walkingBack).point).toEqual(
      touchTargetFor('set', 'overhead', receiver).point,
    );
  });
});
