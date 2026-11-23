/** Suggested points only; never automatically approves or publishes a reward.
 * Rate is configurable as integer points per TWD, with an optional rounding increment.
 * No default rate is defined until the association formally approves a policy.
 */
export function suggestSharePoints({referenceValueTwd,pointsPerTwd,roundTo=1}) {
 if(!Number.isSafeInteger(referenceValueTwd)||referenceValueTwd<=0)throw new RangeError('Reference value must be a positive integer TWD amount');
 if(!Number.isSafeInteger(pointsPerTwd)||pointsPerTwd<=0)throw new RangeError('An approved positive integer rate is required');
 if(!Number.isSafeInteger(roundTo)||roundTo<=0)throw new RangeError('Rounding increment must be a positive integer');
 const raw=referenceValueTwd*pointsPerTwd;
 if(!Number.isSafeInteger(raw))throw new RangeError('Points calculation overflow');
 const points=Math.ceil(raw/roundTo)*roundTo;
 if(!Number.isSafeInteger(points))throw new RangeError('Rounded points overflow');
 return points;
}
