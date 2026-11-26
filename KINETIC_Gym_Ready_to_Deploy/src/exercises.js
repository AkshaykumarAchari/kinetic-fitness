/** Public, curated exercise catalog. IDs are stable Firestore identifiers. */
export const EXERCISES = Object.freeze([
  { id:'squat', name:'Bodyweight Squat', group:'Legs', level:'Beginner', duration:'6 sec', equipment:'Bodyweight', target:'Quads · Glutes', cues:['Keep your chest tall','Sit your hips down and back','Push through your whole foot'] },
  { id:'pushup', name:'Push-Up', group:'Chest', level:'Intermediate', duration:'6 sec', equipment:'Bodyweight', target:'Chest · Triceps', cues:['Keep a straight body line','Lower with elbows controlled','Press up without sagging'] },
  { id:'lunge', name:'Reverse Lunge', group:'Legs', level:'Beginner', duration:'6 sec', equipment:'Bodyweight', target:'Quads · Glutes', cues:['Step back with control','Keep your front knee aligned','Drive through your front heel'] },
  { id:'curl', name:'Dumbbell Curl', group:'Arms', level:'Beginner', duration:'6 sec', equipment:'Dumbbells', target:'Biceps', cues:['Keep elbows close to ribs','Curl without swinging','Lower the weights slowly'] },
  { id:'press', name:'Shoulder Press', group:'Shoulders', level:'Intermediate', duration:'6 sec', equipment:'Dumbbells', target:'Deltoids · Triceps', cues:['Brace your midsection','Press above shoulder line','Lower with control'] },
  { id:'deadlift', name:'Romanian Deadlift', group:'Legs', level:'Intermediate', duration:'6 sec', equipment:'Dumbbells', target:'Hamstrings · Glutes', cues:['Keep a neutral spine','Hinge from your hips','Keep weights close to legs'] },
  { id:'jack', name:'Jumping Jack', group:'Cardio', level:'Beginner', duration:'6 sec', equipment:'Bodyweight', target:'Full body · Heart', cues:['Land softly','Keep breathing steadily','Move arms and feet together'] },
  { id:'plank', name:'Forearm Plank', group:'Core', level:'Beginner', duration:'6 sec', equipment:'Bodyweight', target:'Abs · Core', cues:['Stack elbows under shoulders','Brace core and glutes','Avoid lifting or dropping hips'] },
  { id:'climber', name:'Mountain Climber', group:'Cardio', level:'Intermediate', duration:'6 sec', equipment:'Bodyweight', target:'Core · Cardio', cues:['Keep hands under shoulders','Drive alternating knees forward','Minimize hip rocking'] },
  { id:'row', name:'Bent-Over Row', group:'Back', level:'Intermediate', duration:'6 sec', equipment:'Dumbbells', target:'Lats · Upper back', cues:['Hinge and brace your core','Pull elbows past your ribs','Lower dumbbells slowly'] }
]);
export const EXERCISE_MAP = new Map(EXERCISES.map(e => [e.id, e]));
export const GROUPS = ['All', ...new Set(EXERCISES.map(e => e.group))];
export const DAYS = Object.freeze(['mon','tue','wed','thu','fri','sat','sun']);
export const DAY_LABELS = Object.freeze(['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']);
export const DEFAULT_PROGRAM = Object.freeze({
  mon:[['squat',3,12],['lunge',3,10],['plank',3,30]],
  tue:[['pushup',3,10],['row',3,12],['curl',3,12]],
  wed:[['jack',3,40],['climber',3,30],['plank',3,30]],
  thu:[['deadlift',3,12],['squat',3,12],['lunge',3,10]],
  fri:[['press',3,10],['pushup',3,10],['curl',3,12]],
  sat:[['jack',3,40],['row',3,12],['climber',3,30]],
  sun:[]
});
