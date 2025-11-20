import { useState, useEffect } from 'react';
import { Timer, Dumbbell, Calendar, Download, ArrowLeft, Check, Plus, Minus, ChevronDown, ChevronRight, List, ChevronLeft, Trash2, Upload, Save, RotateCcw, Info, Trophy } from 'lucide-react';

// --- Types ---

interface ExerciseDef {
  name: string;
  sets: number;
  repRange: string;
  note?: string;
  bodyweight?: boolean | null;
  options?: string[];
  superset?: string; // Name of the exercise paired with
  isSuperset?: boolean; // True if this is the SECOND part of a superset
}

interface WorkoutDef {
  name: string;
  focus: string; // Added for the menu description
  exercises: ExerciseDef[];
}

interface SetLog {
  exercise: string;
  set: number;
  weight: number;
  reps: number;
  timestamp: string;
}

interface WorkoutSession {
  workout: string;
  date: string;
  exercises: SetLog[];
}

type ScreenState = 'home' | 'workout' | 'history' | 'export' | 'import' | 'trophy';

// --- Constants ---

const WORKOUTS: Record<string, WorkoutDef> = {
  A: {
    name: 'Full Body A',
    focus: 'Squat Pattern',
    exercises: [
      { name: 'Squats', sets: 3, repRange: '6-10', note: 'Machine/smith/barbell all fine', bodyweight: false },
      { 
        name: 'Push-ups/DB Bench', 
        sets: 3, 
        repRange: '8-12', 
        options: ['Push-ups', 'DB Bench'],
        superset: 'EZ Bar Curls',
        bodyweight: null
      },
      { name: 'EZ Bar Curls', sets: 3, repRange: '8-12', isSuperset: true, bodyweight: false },
      { name: 'Bulgarian Split Squats', sets: 3, repRange: '8-12', note: 'Each leg', superset: 'Calf Raises', bodyweight: false },
      { name: 'Calf Raises', sets: 3, repRange: '10-15', isSuperset: true, bodyweight: false },
      { name: 'Abs', sets: 3, repRange: '12-15', note: 'Machine/crunches/your choice', bodyweight: true }
    ]
  },
  B: {
    name: 'Full Body B',
    focus: 'Hip Hinge / Deadlift',
    exercises: [
      { name: 'RDLs', sets: 3, repRange: '8-12', bodyweight: false },
      { 
        name: 'Lat Pulldowns/Assisted Pullups', 
        sets: 3, 
        repRange: '10-15',
        options: ['Lat Pulldowns', 'Assisted Pullups'],
        superset: 'Lateral Raises',
        bodyweight: null
      },
      { name: 'Lateral Raises', sets: 3, repRange: '12-15', isSuperset: true, bodyweight: false },
      { name: 'Hip Thrusts', sets: 3, repRange: '12-15', superset: 'Triceps Pushdowns', bodyweight: false },
      { name: 'Triceps Pushdowns', sets: 3, repRange: '10-15', isSuperset: true, bodyweight: false },
      { name: 'Calf Raises', sets: 3, repRange: '10-15', bodyweight: false }
    ]
  },
  C: {
    name: 'Full Body C',
    focus: 'Leg Press / Machine',
    exercises: [
      { name: 'Leg Press', sets: 3, repRange: '8-12', bodyweight: false },
      { name: 'DB OHP', sets: 3, repRange: '6-10', superset: 'Machine Row', bodyweight: false },
      { name: 'Machine Row', sets: 3, repRange: '8-12', isSuperset: true, bodyweight: false },
      { 
        name: 'DB Bench/Push-ups', 
        sets: 3, 
        repRange: '8-12',
        options: ['DB Bench', 'Push-ups'],
        superset: 'Back Extensions',
        bodyweight: null
      },
      { name: 'Back Extensions', sets: 3, repRange: '12-15', note: 'Glute-focused', isSuperset: true, bodyweight: true },
      { name: 'Calf Raises', sets: 3, repRange: '10-15', bodyweight: false }
    ]
  }
};

const ENCOURAGEMENTS = [
  "Imagine the weight just insulted Joj 🐱😡",
  "Shirtless Steve is rooting for you 💪",
  "Make sure to wiggle before this set 💃",
  "LIGHT WEIGHT BABY! 🏋️‍♀️",
  "Do it for the snacks waiting at home 🥨",
  "Get a PB for PB! 🥜",
  "This exercise is better than goblin squats 👺",
  "Rep til you can carry ALL the grocery bags 🛒",
  "Feral mode, ACTIVATE! 🐅",
  "WINNING EVERYDAY! 🏆 I AVOID MISTAKES",
  "WINNING EVERYDAY! 🏆 DON'T LIKE SECOND PLACE!",
  "CARPE DIEM! (how 'bout we seize the day?) 🌞",
  "Hopped outta bed, what I'm gonna eat?! 🍳",
  "Accomplishing my tasks, I rinse it and repeat! 🔁"
];

const WORKOUT_ORDER = ['A', 'B', 'C'];

// --- Styles ---

const styles = `
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type=number] {
    -moz-appearance: textfield;
  }
  
  @keyframes confetti-fall {
    0% { transform: translateY(-100%) rotate(0deg); }
    100% { transform: translateY(100vh) rotate(360deg); }
  }
  
  .confetti {
    position: fixed;
    width: 10px;
    height: 10px;
    top: -10%;
    z-index: 50;
    animation: confetti-fall linear forwards;
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #f1f1f1; 
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #fbcfe8; 
    border-radius: 4px;
  }
`;

// --- Main Component ---

export default function BekahBuilder() {
  // App State
  const [screen, setScreen] = useState<ScreenState>('home');
  const [selectedWorkout, setSelectedWorkout] = useState<string | null>(null);
  const [exerciseChoices, setExerciseChoices] = useState<Record<string, string>>({});
  const [setupScreen, setSetupScreen] = useState(false);
  
  // Workout State
  const [currentExerciseIdx, setCurrentExerciseIdx] = useState(0);
  const [currentSetIdx, setCurrentSetIdx] = useState(0);
  const [sessionData, setSessionData] = useState<SetLog[]>([]);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutSession[]>([]);
  
  // Pending Navigation State
  const [pendingNav, setPendingNav] = useState<{exIdx: number, setIdx: number} | null>(null);

  // Timer State
  const [timerActive, setTimerActive] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [showRestChoice, setShowRestChoice] = useState(false);
  const [suggestedRestTime, setSuggestedRestTime] = useState(120);
  
  // UI State
  const [encouragement, setEncouragement] = useState('');
  const [lastEncouragementIdx, setLastEncouragementIdx] = useState<number>(-1);
  
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [showProgressView, setShowProgressView] = useState(false);
  const [expandedExercises, setExpandedExercises] = useState<Record<number, boolean>>({});
  const [showCompletionScreen, setShowCompletionScreen] = useState(false);
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<Date | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [importText, setImportText] = useState('');
  const [hasActiveSession, setHasActiveSession] = useState(false);

  // Confetti State
  const [confetti, setConfetti] = useState<{id: number, color: string, left: string, animationDuration: string, delay: string}[]>([]);

  // --- Effects ---

  useEffect(() => {
    const saved = localStorage.getItem('bekah-builder-data');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setWorkoutHistory(data.history || []);
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }

    const activeSession = localStorage.getItem('bekah-builder-active-session');
    if (activeSession) {
      setHasActiveSession(true);
    }
  }, []);

  useEffect(() => {
    if (workoutHistory.length > 0) {
      localStorage.setItem('bekah-builder-data', JSON.stringify({
        history: workoutHistory
      }));
    }
  }, [workoutHistory]);

  useEffect(() => {
    if (screen === 'workout' && selectedWorkout) {
      const activeState = {
        selectedWorkout,
        exerciseChoices,
        currentExerciseIdx,
        currentSetIdx,
        sessionData,
        weight,
        reps,
        timestamp: new Date().getTime()
      };
      localStorage.setItem('bekah-builder-active-session', JSON.stringify(activeState));
    }
  }, [screen, selectedWorkout, exerciseChoices, currentExerciseIdx, currentSetIdx, sessionData, weight, reps]);

  useEffect(() => {
    let interval: any;
    if (timerActive && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(s => s - 1);
      }, 1000);
    } else if (timerSeconds === 0 && timerActive) {
      playTimerSound();
      setTimerActive(false);
      setShowRestChoice(false);
    }
    return () => clearInterval(interval);
  }, [timerActive, timerSeconds]);

  useEffect(() => {
    if (showCompletionScreen) {
      const colors = ['#ec4899', '#f472b6', '#fb7185', '#fbcfe8', '#ffd700'];
      const newConfetti = Array.from({ length: 50 }).map((_, i) => ({
        id: i,
        color: colors[Math.floor(Math.random() * colors.length)],
        left: `${Math.random() * 100}%`,
        animationDuration: `${Math.random() * 3 + 2}s`,
        delay: `${Math.random() * 0.5}s`
      }));
      setConfetti(newConfetti);
      
      localStorage.removeItem('bekah-builder-active-session');
      setHasActiveSession(false);
    }
  }, [showCompletionScreen]);


  // --- Helpers ---

  const getNewEncouragement = () => {
    let newIdx;
    do {
      newIdx = Math.floor(Math.random() * ENCOURAGEMENTS.length);
    } while (newIdx === lastEncouragementIdx && ENCOURAGEMENTS.length > 1);
    
    setLastEncouragementIdx(newIdx);
    return ENCOURAGEMENTS[newIdx];
  };

  const playTimerSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      const now = ctx.currentTime;

      const frequencies = [523.25, 659.25, 783.99];
      
      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.value = freq;
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now + (i * 0.05)); 
        osc.stop(now + 2);
      });
    } catch (e) {
      console.error("Audio play failed", e);
    }
  };

  const getLastWorkout = () => {
    if (workoutHistory.length === 0) return null;
    return workoutHistory[0];
  };

  const getNextWorkout = () => {
    const last = getLastWorkout();
    if (!last) return 'A';
    const lastIdx = WORKOUT_ORDER.indexOf(last.workout);
    return WORKOUT_ORDER[(lastIdx + 1) % WORKOUT_ORDER.length];
  };

  const startWorkout = (workoutKey: string) => {
    setSelectedWorkout(workoutKey);
    setSetupScreen(true);
    
    const workout = WORKOUTS[workoutKey];
    const defaults: Record<string, string> = {};
    workout.exercises.forEach(ex => {
        if (ex.options && ex.options.length > 0) {
             if (!exerciseChoices[ex.name]) {
                 defaults[ex.name] = ex.options[0];
             }
        }
    });
    if (Object.keys(defaults).length > 0) {
        setExerciseChoices(prev => ({...prev, ...defaults}));
    }
  };

  const resumeActiveSession = () => {
    try {
      const saved = localStorage.getItem('bekah-builder-active-session');
      if (saved) {
        const data = JSON.parse(saved);
        if (new Date().getTime() - data.timestamp > 12 * 60 * 60 * 1000) {
            localStorage.removeItem('bekah-builder-active-session');
            setHasActiveSession(false);
            alert("Saved session is too old.");
            return;
        }

        setSelectedWorkout(data.selectedWorkout);
        setExerciseChoices(data.exerciseChoices || {});
        setCurrentExerciseIdx(data.currentExerciseIdx);
        setCurrentSetIdx(data.currentSetIdx);
        setSessionData(data.sessionData);
        setWeight(data.weight);
        setReps(data.reps);
        setScreen('workout');
        setEncouragement("Welcome back! Let's finish this. 💪");
      }
    } catch (e) {
      console.error("Failed to resume", e);
      localStorage.removeItem('bekah-builder-active-session');
      setHasActiveSession(false);
    }
  };

  const beginWorkout = (workoutKey: string) => {
    setCurrentExerciseIdx(0);
    setCurrentSetIdx(0);
    setSessionData([]);
    setScreen('workout');
    setSetupScreen(false);
    setShowProgressView(false);
    setExpandedExercises({});
    
    const workout = WORKOUTS[workoutKey];
    loadExerciseData(workout, 0);
    
    setEncouragement(getNewEncouragement());
  };

  const loadExerciseData = (workout: WorkoutDef, exIdx: number) => {
    const exercise = getEffectiveExercise(workout.exercises[exIdx]);
    const repRange = exercise.repRange.match(/(\d+)-(\d+)/);
    if (repRange) {
      setReps(repRange[1]);
    }
    
    const lastPerf = getLastPerformance(exercise.name);
    if (lastPerf && lastPerf.length > 0 && !exercise.bodyweight) {
      setWeight(lastPerf[0].weight.toString());
    } else {
      setWeight('');
    }
  };

  const getEffectiveExercise = (exercise: ExerciseDef) => {
    if (exercise.options && exerciseChoices[exercise.name]) {
      const chosenOption = exerciseChoices[exercise.name];
      const isAssisted = chosenOption.toLowerCase().includes('assisted');
      
      const isBodyweight = (chosenOption.toLowerCase().includes('push-up') || 
                          chosenOption.toLowerCase().includes('pullup') ||
                          chosenOption.toLowerCase().includes('pushups')) && !isAssisted;
      
      return {
        ...exercise,
        name: chosenOption,
        bodyweight: isBodyweight
      };
    }
    return exercise;
  };

  const logSet = () => {
    if (!selectedWorkout) return;
    const workout = WORKOUTS[selectedWorkout];
    const exercise = getEffectiveExercise(workout.exercises[currentExerciseIdx]);
    
    if ((!exercise.bodyweight && !weight) || !reps) return;
    if (parseInt(reps) < 0 || (!exercise.bodyweight && parseFloat(weight) < 0)) return;

    const currentWeight = exercise.bodyweight ? 0 : parseFloat(weight);
    const currentReps = parseInt(reps);

    // 1. Log the data
    const setData: SetLog = {
      exercise: exercise.name,
      set: currentSetIdx + 1,
      weight: currentWeight,
      reps: currentReps,
      timestamp: new Date().toISOString()
    };

    const newSessionData = [...sessionData, setData];
    setSessionData(newSessionData);

    // 2. Calculate Next State (Alternating Set Logic)
    let nextExIdx = currentExerciseIdx;
    let nextSetIdx = currentSetIdx;
    let restTime = 120; // default

    const isSupersetPair1 = exercise.superset && !exercise.isSuperset; 
    const isSupersetPair2 = exercise.isSuperset;

    if (isSupersetPair1) {
        nextExIdx = currentExerciseIdx + 1;
        nextSetIdx = currentSetIdx; 
        restTime = 60; 
        
        // Special override for Bulgarian Split Squats
        if (exercise.name.includes('Bulgarian') || exercise.name.includes('Split Squat')) {
            restTime = 120;
        }
    } else if (isSupersetPair2) {
        if (currentSetIdx + 1 < exercise.sets) {
            nextExIdx = currentExerciseIdx - 1;
            nextSetIdx = currentSetIdx + 1;
            restTime = 120; 
        } else {
            nextExIdx = currentExerciseIdx + 1;
            nextSetIdx = 0;
            restTime = 120;
        }
    } else {
        // Standard Straight Sets
        if (currentSetIdx + 1 < exercise.sets) {
            nextExIdx = currentExerciseIdx;
            nextSetIdx = currentSetIdx + 1;
            
            if (currentExerciseIdx === 0) restTime = 180; // First exercise = 3 mins
            else if (exercise.name.toLowerCase().includes('abs')) restTime = 60;
            else restTime = 120; 
        } else {
            // Finished exercise. Move to next.
            nextExIdx = currentExerciseIdx + 1;
            nextSetIdx = 0;
            // Special logic: If we just finished the MAIN exercise (Index 0), suggested rest is 3 mins
            if (currentExerciseIdx === 0) {
                restTime = 180;
            } else {
                restTime = 120;
            }
        }
    }

    // 3. Handle Workout Completion
    if (nextExIdx >= workout.exercises.length) {
        finishWorkout(newSessionData);
        return;
    }

    // 4. Set up state for Rest Screen
    setPendingNav({ exIdx: nextExIdx, setIdx: nextSetIdx });
    setSuggestedRestTime(restTime);
    setShowRestChoice(true);
  };

  const performNavigation = () => {
    if (!pendingNav || !selectedWorkout) return;
    const workout = WORKOUTS[selectedWorkout];
    
    setCurrentExerciseIdx(pendingNav.exIdx);
    setCurrentSetIdx(pendingNav.setIdx);

    const nextExercise = getEffectiveExercise(workout.exercises[pendingNav.exIdx]);
    
    const sessionSets = sessionData.filter(s => s.exercise === nextExercise.name);
    if (sessionSets.length > 0) {
        const lastSet = sessionSets[sessionSets.length - 1];
        setWeight(lastSet.weight.toString());
        setReps(lastSet.reps.toString());
    } else {
        loadExerciseData(workout, pendingNav.exIdx);
    }

    setEncouragement(getNewEncouragement());
    setPendingNav(null);
  }

  const startRest = (seconds: number) => {
    setTimerSeconds(seconds);
    setTimerActive(true);
    setShowRestChoice(false);
  };

  const handleStartSet = () => {
    setTimerActive(false);
    setTimerSeconds(0);
    setShowRestChoice(false);
    performNavigation();
  };

  const skipRest = () => {
    setShowRestChoice(false);
    setTimerActive(false);
    performNavigation();
  }

  const finishWorkout = (finalSessionData: SetLog[]) => {
    if (!selectedWorkout) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingTodayIdx = workoutHistory.findIndex(session => {
      const sessionDate = new Date(session.date);
      sessionDate.setHours(0, 0, 0, 0);
      return sessionDate.getTime() === today.getTime();
    });
    
    const workoutSession: WorkoutSession = {
      workout: selectedWorkout,
      date: new Date().toISOString(),
      exercises: finalSessionData
    };
    
    let newHistory;
    if (existingTodayIdx !== -1) {
      newHistory = [...workoutHistory];
      newHistory[existingTodayIdx] = workoutSession;
    } else {
      newHistory = [workoutSession, ...workoutHistory];
    }
    
    setWorkoutHistory(newHistory);
    setShowCompletionScreen(true);
  };

  const getLastPerformance = (exerciseName: string) => {
    for (let session of workoutHistory) {
      const exerciseSets = session.exercises.filter(e => e.exercise === exerciseName);
      if (exerciseSets.length > 0) {
        return exerciseSets;
      }
    }
    return null;
  };

  const exportData = () => JSON.stringify({ history: workoutHistory }, null, 2);
  
const deleteWorkout = (date: Date) => {
  const dateStr = date.toDateString();
  const newHistory = workoutHistory.filter(session => {
    const sessionDate = new Date(session.date);
    return sessionDate.toDateString() !== dateStr;
  });
  setWorkoutHistory(newHistory);
  setSelectedHistoryDate(null);
  setShowDeleteConfirm(false);
};

  const copyToClipboard = async () => {
      try {
        await navigator.clipboard.writeText(exportData());
        alert("Copied to clipboard!");
      } catch (err) {
        const textArea = document.createElement("textarea");
        textArea.value = exportData();
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        alert("Copied to clipboard!");
      }
  };

  const importData = () => {
    try {
      const data = JSON.parse(importText);
      if (data.history && Array.isArray(data.history)) {
        setWorkoutHistory(data.history);
        alert('History imported successfully!');
        setScreen('home');
        setImportText('');
      } else {
        alert('Invalid data format.');
      }
    } catch (e) {
      alert('Invalid JSON.');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRepRangeColor = (currentReps: string, repRange: string) => {
    const match = repRange.match(/(\d+)-(\d+)/);
    if (!match) return 'text-gray-800';
    
    const min = parseInt(match[1]);
    const max = parseInt(match[2]);
    const reps = parseInt(currentReps);
    
    if (reps < min) return 'text-red-500';
    if (reps <= max) return 'text-green-600';
    return 'text-orange-500'; 
  };

  const shouldShowWeightIncreaseTip = (currentReps: string, repRange: string) => {
    const match = repRange.match(/(\d+)-(\d+)/);
    if (!match) return false;
    const max = parseInt(match[2]);
    return parseInt(currentReps) > max;
  };

  const shouldShowWeightDecreaseTip = (currentReps: string, repRange: string) => {
    const match = repRange.match(/(\d+)-(\d+)/);
    if (!match) return false;
    const min = parseInt(match[1]);
    return parseInt(currentReps) < min;
  };
  
  const getTrophyData = () => {
      const bests: Record<string, { weight: number, reps: number, date: string, isAssisted: boolean }> = {};
      
      workoutHistory.forEach(session => {
          session.exercises.forEach(set => {
              const name = set.exercise;
              const isAssisted = name.toLowerCase().includes('assisted');
              
              if (!bests[name]) {
                  bests[name] = { weight: set.weight, reps: set.reps, date: session.date, isAssisted };
              } else {
                  const currentBest = bests[name];
                  let isNewBest = false;
                  
                  if (isAssisted) {
                      // Assisted: Lower weight is better
                      if (set.weight < currentBest.weight) isNewBest = true;
                      else if (set.weight === currentBest.weight && set.reps > currentBest.reps) isNewBest = true;
                  } else if (set.weight === 0) {
                      // Bodyweight: More reps is better
                      if (set.reps > currentBest.reps) isNewBest = true;
                  } else {
                      // Standard: Higher weight is better
                      if (set.weight > currentBest.weight) isNewBest = true;
                      else if (set.weight === currentBest.weight && set.reps > currentBest.reps) isNewBest = true;
                  }
                  
                  if (isNewBest) {
                      bests[name] = { weight: set.weight, reps: set.reps, date: session.date, isAssisted };
                  }
              }
          });
      });
      return bests;
  };

  // Calendar Logic
  const getCalendarDays = () => {
    const firstDay = new Date(calendarYear, calendarMonth, 1);
    const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
    const days = [];
    const startPadding = firstDay.getDay();
    for (let i = 0; i < startPadding; i++) { days.push(null); }
    for (let i = 1; i <= lastDay.getDate(); i++) { days.push(new Date(calendarYear, calendarMonth, i)); }
    return days;
  };

  const getWorkoutForDate = (date: Date | null) => {
    if (!date) return null;
    const dateStr = date.toDateString();
    return workoutHistory.find(session => {
      const sessionDate = new Date(session.date);
      return sessionDate.toDateString() === dateStr;
    });
  };

  const changeMonth = (delta: number) => {
    let newMonth = calendarMonth + delta;
    let newYear = calendarYear;
    if (newMonth > 11) { newMonth = 0; newYear++; } 
    else if (newMonth < 0) { newMonth = 11; newYear--; }
    setCalendarMonth(newMonth);
    setCalendarYear(newYear);
  };

  // --- Renders ---

  if (setupScreen && selectedWorkout) {
    const workout = WORKOUTS[selectedWorkout];
    const exercisesWithOptions = workout.exercises.filter(ex => ex.options);

    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-pink-100 to-rose-100 p-4 font-sans">
        <style>{styles}</style>
        <div className="max-w-md mx-auto">
          <button
            onClick={() => {
              setSetupScreen(false);
              setSelectedWorkout(null);
            }}
            className="mb-4 text-pink-600 flex items-center gap-2"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>

          <div className="bg-white rounded-2xl p-6 shadow-lg mb-4">
            <h2 className="text-2xl font-bold text-pink-600 mb-4">{workout.name}</h2>
            
            {/* Exercise List Preview */}
            <div className="mb-6">
                <h3 className="font-semibold text-gray-700 mb-2">Workout Preview:</h3>
                <div className="space-y-2">
                    {workout.exercises.map((ex, idx) => {
                        const effective = getEffectiveExercise(ex);
                        return (
                            <div key={idx} className={`text-sm text-gray-600 flex items-center gap-2 ${ex.isSuperset ? 'ml-4 border-l-2 border-pink-200 pl-2' : ''}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${ex.isSuperset ? 'bg-pink-300' : 'bg-pink-500'}`}></div>
                                <span>{effective.name}</span>
                                <span className="text-gray-400 text-xs">
                                    ({ex.sets} × {effective.bodyweight ? 'AMRAP' : ex.repRange})
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
            
            {/* Exercise Swaps */}
            {exercisesWithOptions.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-xl mb-4 border border-gray-100">
                <h3 className="font-semibold text-gray-700 mb-3">Choose Your Exercises:</h3>
                {exercisesWithOptions.map((exercise, idx) => (
                    <div key={idx} className="mb-4 last:mb-0">
                    <p className="text-sm font-semibold text-gray-700 mb-2">{exercise.name}:</p>
                    <div className="grid grid-cols-2 gap-2">
                        {exercise.options?.map(option => (
                        <button
                            key={option}
                            onClick={() => setExerciseChoices({...exerciseChoices, [exercise.name]: option})}
                            className={`p-3 rounded-lg border-2 transition-all text-sm ${
                            exerciseChoices[exercise.name] === option
                                ? 'border-pink-500 bg-pink-50 text-pink-700 font-semibold'
                                : 'border-gray-200 bg-white text-gray-700'
                            }`}
                        >
                            {option}
                        </button>
                        ))}
                    </div>
                    </div>
                ))}
                </div>
            )}
            
            <button
              onClick={() => beginWorkout(selectedWorkout)}
              className="w-full bg-pink-500 text-white rounded-xl p-4 font-bold text-lg shadow-lg hover:bg-pink-600 active:scale-95 transition-all mt-4"
            >
              Start Workout
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showCompletionScreen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-pink-100 to-rose-100 p-4 flex items-center justify-center overflow-hidden font-sans">
        <style>{styles}</style>
        {confetti.map(c => (
          <div
            key={c.id}
            className="confetti"
            style={{
              backgroundColor: c.color,
              left: c.left,
              animationDuration: c.animationDuration,
              animationDelay: c.delay
            }}
          />
        ))}
        <div className="max-w-md mx-auto text-center z-10 bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-xl">
          <div className="text-8xl mb-4 animate-bounce">🎉</div>
          <h1 className="text-4xl font-bold text-pink-600 mb-2">Workout Complete!</h1>
          <p className="text-xl text-pink-500 mb-8">You crushed it! 💪✨</p>
          
          <button
            onClick={() => {
              setShowCompletionScreen(false);
              setScreen('home');
            }}
            className="bg-pink-500 text-white rounded-xl px-8 py-4 font-bold text-lg shadow-lg hover:bg-pink-600 active:scale-95 transition-all w-full"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'home') {
    const lastWorkout = getLastWorkout();
    const nextWorkout = getNextWorkout();

    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-pink-100 to-rose-100 p-4 font-sans pb-12">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8 pt-8">
            <h1 className="text-4xl font-bold text-pink-600 mb-2">Bekah Builder</h1>
            <p className="text-pink-500 text-sm font-medium">Baby Bekah's personal workout app <span className="text-yellow-400">★</span> <span className="text-blue-400">✨</span> <span className="text-green-400">💪</span></p>
            
            {lastWorkout && (
              <div className="mt-4 bg-white rounded-xl p-3 shadow-md text-sm inline-block">
                <p className="text-gray-600">
                  Next up: <span className="font-bold text-pink-600">Full Body {nextWorkout}</span>
                </p>
              </div>
            )}
          </div>

          {hasActiveSession && (
             <button
             onClick={resumeActiveSession}
             className="w-full bg-white border-2 border-pink-500 rounded-2xl p-4 shadow-lg hover:bg-pink-50 transition-all active:scale-95 mb-6 flex items-center justify-center gap-3 group"
           >
             <div className="bg-pink-100 p-2 rounded-full group-hover:bg-pink-200 transition-colors">
                <RotateCcw className="text-pink-600" size={24} />
             </div>
             <div className="text-left">
               <h3 className="text-lg font-bold text-pink-600">Resume Workout</h3>
               <p className="text-xs text-gray-500">Continue where you left off</p>
             </div>
           </button>
          )}

          <div className="space-y-4 mb-8">
            {Object.keys(WORKOUTS).map(key => {
                const isNext = nextWorkout === key;
                return (
                    <button
                        key={key}
                        onClick={() => startWorkout(key)}
                        className={`w-full bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all active:scale-95 group relative overflow-hidden ${isNext ? 'ring-4 ring-pink-300 ring-opacity-50' : ''}`}
                    >
                        {isNext && (
                            <div className="absolute top-0 top-0 inset-x-0 h-1 bg-gradient-to-r from-pink-400 via-rose-400 to-pink-400 animate-pulse"></div>
                        )}
                        <div className="absolute top-0 right-0 bg-pink-100 px-3 py-1 rounded-bl-xl text-xs font-bold text-pink-600">
                            {WORKOUTS[key].focus}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                        <div className="text-left">
                            <h3 className="text-xl font-bold text-pink-600 group-hover:text-pink-700 transition-colors flex items-center gap-2">
                                {WORKOUTS[key].name}
                                {isNext && <span className="text-xs bg-pink-500 text-white px-2 py-0.5 rounded-full">Next</span>}
                            </h3>
                            <p className="text-sm text-gray-500">
                                {getEffectiveExercise(WORKOUTS[key].exercises[0]).name}
                            </p>
                        </div>
                        <div className="bg-pink-50 p-3 rounded-full group-hover:bg-pink-100 transition-colors">
                            <Dumbbell className="text-pink-400" size={24} />
                        </div>
                        </div>
                    </button>
                );
            })}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-8">
            <button
              onClick={() => setScreen('history')}
              className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all active:scale-95 flex flex-col items-center justify-center gap-2"
            >
              <Calendar className="text-pink-400" size={24} />
              <p className="text-xs font-semibold text-gray-700">History</p>
            </button>
             <button
              onClick={() => setScreen('trophy')}
              className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all active:scale-95 flex flex-col items-center justify-center gap-2"
            >
              <Trophy className="text-yellow-400" size={24} />
              <p className="text-xs font-semibold text-gray-700">Records</p>
            </button>
            <button
              onClick={() => setScreen('export')}
              className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all active:scale-95 flex flex-col items-center justify-center gap-2"
            >
              <Save className="text-blue-400" size={24} />
              <p className="text-xs font-semibold text-gray-700">Data</p>
            </button>
          </div>
          
          <div className="text-center">
            <p className="text-xs text-pink-300 font-medium">Copyright Steve from the CRA, 2025</p>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'workout' && selectedWorkout) {
    const workout = WORKOUTS[selectedWorkout];
    const exercise = getEffectiveExercise(workout.exercises[currentExerciseIdx]);
    const lastPerformance = getLastPerformance(exercise.name);

    // Resolve Superset partner names
    let supersetPartnerName = '';
    let isSupersetActive = false;
    if (exercise.superset && !exercise.isSuperset) {
        supersetPartnerName = exercise.superset;
        isSupersetActive = true;
    } else if (exercise.isSuperset) {
        const prevEx = getEffectiveExercise(workout.exercises[currentExerciseIdx - 1]);
        supersetPartnerName = prevEx.name;
        isSupersetActive = true;
    }

    if (showExitConfirm) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-pink-100 to-rose-100 p-4 flex items-center justify-center font-sans">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Exit Workout?</h2>
              <p className="text-gray-600 mb-6">Your active progress will be cleared.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 bg-gray-200 rounded-xl p-3 text-gray-700 font-semibold active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowExitConfirm(false);
                    localStorage.removeItem('bekah-builder-active-session');
                    setHasActiveSession(false);
                    setScreen('home');
                  }}
                  className="flex-1 bg-red-500 text-white rounded-xl p-3 font-semibold active:scale-95 transition-all hover:bg-red-600"
                >
                  Exit
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (showRestChoice) {
      const restOptions = [60, 120, 180]; 
      
      return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-pink-100 to-rose-100 p-4 flex items-center justify-center font-sans">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
              <Timer className="text-pink-400 mx-auto mb-4" size={48} />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Rest Time</h2>
              <p className="text-gray-600 mb-6">Suggested: {suggestedRestTime / 60} min</p>
              
              <div className="space-y-3">
                {restOptions.map(seconds => (
                  <button
                    key={seconds}
                    onClick={() => startRest(seconds)}
                    className={`w-full rounded-xl p-4 font-bold text-lg shadow-lg active:scale-95 transition-all flex justify-between items-center px-6 ${
                      seconds === suggestedRestTime
                        ? 'bg-pink-500 text-white hover:bg-pink-600 ring-4 ring-pink-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span>{seconds / 60} {seconds === 60 ? 'minute' : 'minutes'}</span>
                    {seconds === suggestedRestTime && <span className="text-xs bg-white/20 px-2 py-1 rounded">Recommended</span>}
                  </button>
                ))}
                <button 
                    onClick={() => skipRest()}
                    className="w-full text-gray-400 text-sm font-semibold py-2 hover:text-gray-600"
                >
                    Skip Rest
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (timerActive || (!timerActive && timerSeconds > 0 && showRestChoice === false)) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-pink-100 to-rose-100 p-4 flex items-center justify-center font-sans">
            <style>{styles}</style>
          <div className="max-w-md w-full">
            <div className="bg-white rounded-2xl p-8 shadow-lg text-center relative overflow-hidden">
              <div 
                className="absolute bottom-0 left-0 h-2 bg-pink-500 transition-all duration-1000 ease-linear"
                style={{ width: `${(timerSeconds / (suggestedRestTime || 120)) * 100}%` }}
              ></div>

              <Timer className={`text-pink-400 mx-auto mb-4 ${timerActive ? 'animate-pulse' : ''}`} size={48} />
              <p className="text-sm text-gray-600 mb-2">{timerActive ? 'Resting...' : 'Paused'}</p>
              <p className="text-7xl font-bold text-pink-600 mb-8 font-mono tabular-nums">{formatTime(timerSeconds)}</p>

              <div className="flex gap-3">
                <button
                  onClick={() => setTimerActive(!timerActive)}
                  className="flex-1 bg-gray-200 rounded-xl p-3 text-gray-700 font-semibold active:scale-95 transition-all"
                >
                  {timerActive ? 'Pause' : 'Resume'}
                </button>
                <button
                  onClick={handleStartSet}
                  className="flex-1 bg-pink-500 text-white rounded-xl p-3 font-semibold active:scale-95 transition-all shadow-lg shadow-pink-200"
                >
                  Start Set
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (showProgressView) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-pink-100 to-rose-100 p-4 font-sans">
          <div className="max-w-md mx-auto">
            <div className="flex justify-between items-center mb-4">
              <button
                onClick={() => setShowProgressView(false)}
                className="text-pink-600 flex items-center gap-2 font-semibold bg-white px-3 py-1.5 rounded-lg shadow-sm"
              >
                <ArrowLeft size={20} />
                <span>Back</span>
              </button>
              <h2 className="text-xl font-bold text-pink-600">Workout Progress</h2>
              <div className="w-16"></div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-lg space-y-2">
              {workout.exercises.map((ex, idx) => {
                const effectiveEx = getEffectiveExercise(ex);
                const exerciseSets = sessionData.filter(s => s.exercise === effectiveEx.name);
                const isComplete = exerciseSets.length >= ex.sets;
                const isCurrent = idx === currentExerciseIdx;
                
                return (
                  <div key={idx} className={`border-b last:border-0 border-gray-100 pb-2 last:pb-0`}>
                    <button
                      onClick={() => setExpandedExercises({
                        ...expandedExercises,
                        [idx]: !expandedExercises[idx]
                      })}
                      className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${isCurrent ? 'bg-pink-50' : 'hover:bg-gray-50'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${isComplete ? 'bg-green-500' : isCurrent ? 'bg-pink-500' : 'bg-gray-300'}`}></div>
                        <span className={`text-sm font-semibold ${isCurrent ? 'text-pink-700' : 'text-gray-700'}`}>
                          {effectiveEx.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                         <span className="text-xs font-medium">{exerciseSets.length}/{ex.sets}</span>
                         {expandedExercises[idx] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </div>
                    </button>
                    
                    {expandedExercises[idx] && (
                      <div className="ml-4 mt-2 space-y-2 border-l-2 border-gray-100 pl-4 mb-2">
                        {Array.from({ length: ex.sets }).map((_, setIdx) => {
                          const setData = exerciseSets.find(s => s.set === setIdx + 1);
                          return (
                            <div
                              key={setIdx}
                              className="w-full text-left p-2 rounded hover:bg-pink-50 transition-all flex justify-between items-center"
                            >
                                <span className="text-xs text-gray-500 font-medium">Set {setIdx + 1}</span>
                              {setData ? (
                                <div className="text-xs font-mono font-semibold text-gray-700">
                                  {setData.weight > 0 ? `${setData.weight}lb × ` : ''}{setData.reps}
                                </div>
                              ) : (
                                <div className="text-xs text-gray-400 italic">
                                  --
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-pink-100 to-rose-100 p-4 pb-20 font-sans overflow-hidden">
        <style>{styles}</style>
        {confetti.map(c => (
          <div
            key={c.id}
            className="confetti"
            style={{
              backgroundColor: c.color,
              left: c.left,
              animationDuration: c.animationDuration,
              animationDelay: c.delay
            }}
          />
        ))}

        <div className="max-w-md mx-auto">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => setShowExitConfirm(true)}
              className="text-pink-600 flex items-center gap-2 font-medium"
            >
              <ArrowLeft size={20} />
              <span>Exit</span>
            </button>
            <button
              onClick={() => setShowProgressView(true)}
              className="text-pink-600 flex items-center gap-2 font-medium bg-white px-3 py-1.5 rounded-full shadow-sm"
            >
              <List size={18} />
              <span>{currentExerciseIdx + 1}/{workout.exercises.length}</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg mb-4 relative">
            {/* Header Area */}
            <div className="mb-6">
                {isSupersetActive ? (
                    <div className="bg-pink-50 rounded-xl p-3 border border-pink-100">
                        <div className="text-center mb-3">
                            <span className="text-xs font-bold tracking-wider text-pink-500 uppercase flex items-center justify-center gap-1">
                                ⚡ Superset Pair
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            {/* Left Side (Ex 1) */}
                            <div className={`flex-1 text-center p-3 rounded-xl transition-all ${!exercise.isSuperset ? 'bg-white shadow-md ring-2 ring-pink-200 scale-105 z-10' : 'opacity-60 grayscale-[0.5]'}`}>
                                <p className={`font-bold text-gray-800 leading-tight ${!exercise.isSuperset ? 'text-lg' : 'text-sm'}`}>
                                    {exercise.isSuperset ? supersetPartnerName : exercise.name}
                                </p>
                            </div>
                            <div className="text-pink-300 font-bold text-xl">➜</div>
                            {/* Right Side (Ex 2) */}
                            <div className={`flex-1 text-center p-3 rounded-xl transition-all ${exercise.isSuperset ? 'bg-white shadow-md ring-2 ring-pink-200 scale-105 z-10' : 'opacity-60 grayscale-[0.5]'}`}>
                                <p className={`font-bold text-gray-800 leading-tight ${exercise.isSuperset ? 'text-lg' : 'text-sm'}`}>
                                    {exercise.isSuperset ? exercise.name : supersetPartnerName}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <h2 className="text-2xl font-bold text-pink-600 leading-tight text-center mb-1">{exercise.name}</h2>
                )}
            </div>
            
            {/* Set Info */}
            <div className="flex justify-center items-center gap-2 text-sm text-gray-500 font-medium mb-4">
                 <span>Set {currentSetIdx + 1} of {exercise.sets}</span>
                 {!exercise.bodyweight && (
                     <>
                        <span>•</span>
                        <span>Target: {exercise.repRange}</span>
                     </>
                 )}
            </div>

            {/* Note */}
            {exercise.note && (
                <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-3 mb-6 text-center flex items-start gap-2">
                    <Info size={16} className="text-yellow-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-800 font-medium text-left">{exercise.note}</p>
                </div>
            )}

            {/* Previous Performance */}
            {lastPerformance && (
              <div className="bg-blue-50 rounded-xl p-3 mb-6 border border-blue-100">
                <div className="flex justify-between items-center mb-2">
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Last Time</p>
                    <p className="text-xs text-blue-400">{new Date(getLastWorkout()?.date || '').toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {lastPerformance.map((set, idx) => (
                    <div key={idx} className="bg-white rounded px-2 py-1 text-xs font-mono text-blue-800 border border-blue-100 whitespace-nowrap">
                      {set.weight > 0 ? `${set.weight}lb × ` : ''}{set.reps}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Inputs */}
            <div className={`${exercise.bodyweight ? '' : 'grid grid-cols-2 gap-6'} mb-6`}>
              {!exercise.bodyweight && (
                <div className="flex flex-col items-center">
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wide">Weight (lbs)</label>
                  <div className="flex items-center gap-1 max-w-[140px]">
                    <button
                      onClick={() => setWeight(w => Math.max(0, (parseFloat(w) || 0) - 5).toString())}
                      className="bg-pink-100 hover:bg-pink-200 rounded-lg w-8 h-10 flex items-center justify-center active:scale-95 transition-all shrink-0"
                    >
                      <Minus size={16} className="text-pink-600" />
                    </button>
                    <input
                      type="number"
                      value={weight}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (val >= 0 || e.target.value === '') {
                          setWeight(e.target.value);
                        }
                      }}
                      min="0"
                      step="2.5"
                      className="w-full h-10 border-2 border-pink-100 rounded-lg text-center text-lg font-bold text-gray-800 focus:border-pink-400 outline-none"
                      placeholder="0"
                    />
                    <button
                      onClick={() => setWeight(w => ((parseFloat(w) || 0) + 5).toString())}
                      className="bg-pink-100 hover:bg-pink-200 rounded-lg w-8 h-10 flex items-center justify-center active:scale-95 transition-all shrink-0"
                    >
                      <Plus size={16} className="text-pink-600" />
                    </button>
                  </div>
                </div>
              )}              
              <div className={`flex flex-col items-center ${exercise.bodyweight ? 'w-full' : ''}`}>
                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wide">
                    {exercise.bodyweight ? 'Total Reps (AMRAP)' : 'Reps'}
                </label>
                <div className={`flex items-center gap-1 relative ${exercise.bodyweight ? 'max-w-[200px]' : 'max-w-[140px]'}`}>
                  <button
                    onClick={() => setReps(r => Math.max(0, (parseInt(r) || 0) - 1).toString())}
                    className="bg-pink-100 hover:bg-pink-200 rounded-lg w-8 h-10 flex items-center justify-center active:scale-95 transition-all shrink-0"
                  >
                    <Minus size={16} className="text-pink-600" />
                  </button>
                  <input
                    type="number"
                    value={reps}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (val >= 0 || e.target.value === '') {
                        setReps(e.target.value);
                      }
                    }}
                    min="0"
                    className={`w-full h-10 border-2 border-pink-100 rounded-lg text-center text-lg font-bold focus:border-pink-400 outline-none ${!exercise.bodyweight ? getRepRangeColor(reps, exercise.repRange) : 'text-pink-600'}`}
                    placeholder="0"
                  />
                  <button
                    onClick={() => setReps(r => ((parseInt(r) || 0) + 1).toString())}
                    className="bg-pink-100 hover:bg-pink-200 rounded-lg w-8 h-10 flex items-center justify-center active:scale-95 transition-all shrink-0"
                  >
                    <Plus size={16} className="text-pink-600" />
                  </button>

                  {/* Smart Tips - Centered relative to the + button */}
                  {!exercise.bodyweight && (
                    <>
                       {shouldShowWeightIncreaseTip(reps, exercise.repRange) && (
                        <div className="absolute -top-12 right-0 bg-orange-500 text-white text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap z-50 animate-bounce">
                            Too easy? Consider adding weight ⬆️
                            <div className="absolute -bottom-1 right-2 w-2 h-2 bg-orange-500 rotate-45"></div>
                        </div>
                        )}
                        {shouldShowWeightDecreaseTip(reps, exercise.repRange) && (
                        <div className="absolute -top-12 right-0 bg-blue-500 text-white text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap z-50 animate-bounce">
                            Too hard? Consider lowering weight ⬇️
                            <div className="absolute -bottom-1 right-2 w-2 h-2 bg-blue-500 rotate-45"></div>
                        </div>
                        )}
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={logSet}
              disabled={(!exercise.bodyweight && !weight) || !reps}
              className="w-full bg-pink-500 text-white rounded-xl p-4 font-bold text-lg shadow-lg hover:bg-pink-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Check size={24} strokeWidth={3} />
              Log Set
            </button>
          </div>

          {/* Simple Affirmation Text */}
          <div className="text-center px-4 py-2">
            <p className="text-pink-400 font-medium text-sm">{encouragement}</p>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'trophy') {
      const bests = getTrophyData();
      const sortedExercises = Object.keys(bests).sort();

      return (
          <div className="min-h-screen bg-gradient-to-br from-pink-50 via-pink-100 to-rose-100 p-4 font-sans">
              <div className="max-w-md mx-auto">
                  <button
                      onClick={() => setScreen('home')}
                      className="mb-4 text-pink-600 flex items-center gap-2"
                  >
                      <ArrowLeft size={20} />
                      <span>Back</span>
                  </button>
                  
                  <div className="text-center mb-6">
                      <Trophy className="text-yellow-400 mx-auto mb-2" size={48} />
                      <h2 className="text-2xl font-bold text-pink-600">Trophy Room</h2>
                      <p className="text-pink-400 text-sm">Your personal bests! 🌟</p>
                  </div>
                  
                  <div className="space-y-3">
                      {sortedExercises.length === 0 ? (
                          <div className="bg-white rounded-2xl p-8 text-center text-gray-500">
                              <p>No records yet! Start a workout to set some PRs. 💪</p>
                          </div>
                      ) : (
                          sortedExercises.map(name => {
                              const record = bests[name];
                              return (
                                  <div key={name} className="bg-white rounded-xl p-4 shadow-md flex justify-between items-center">
                                      <div>
                                          <h3 className="font-bold text-gray-700">{name}</h3>
                                          <p className="text-xs text-gray-400">{new Date(record.date).toLocaleDateString()}</p>
                                      </div>
                                      <div className="text-right">
                                          {record.weight > 0 ? (
                                              <div className="text-xl font-bold text-pink-600">
                                                  {record.weight}<span className="text-sm font-normal text-gray-500">lbs</span>
                                              </div>
                                          ) : (
                                              <div className="text-xl font-bold text-pink-600">
                                                  {record.reps}<span className="text-sm font-normal text-gray-500">reps</span>
                                              </div>
                                          )}
                                          {record.weight > 0 && (
                                               <div className="text-xs text-gray-400">x {record.reps} reps</div>
                                          )}
                                      </div>
                                  </div>
                              );
                          })
                      )}
                  </div>
              </div>
          </div>
      )
  }

  if (screen === 'history') {
    const calendarDays = getCalendarDays();
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];

    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-pink-100 to-rose-100 p-4 font-sans">
        <div className="max-w-md mx-auto">
          <button
            onClick={() => {
              setScreen('home');
              setSelectedHistoryDate(null);
            }}
            className="mb-4 text-pink-600 flex items-center gap-2"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>

          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => changeMonth(-1)}
              className="p-2 bg-white rounded-lg shadow hover:shadow-md transition-all active:scale-95"
            >
              <ChevronLeft size={20} className="text-pink-600" />
            </button>
            <h2 className="text-xl font-bold text-pink-600">{monthNames[calendarMonth]} {calendarYear}</h2>
            <button
              onClick={() => changeMonth(1)}
              className="p-2 bg-white rounded-lg shadow hover:shadow-md transition-all active:scale-95"
            >
              <ChevronRight size={20} className="text-pink-600" />
            </button>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-lg mb-4">
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                <div key={day} className="text-center text-xs font-semibold text-gray-500 uppercase">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((date, idx) => {
                if (!date) {
                  return <div key={idx} className="aspect-square"></div>;
                }
                
                const workout = getWorkoutForDate(date);
                const isToday = date.toDateString() === new Date().toDateString();
                const isSelected = selectedHistoryDate && date.toDateString() === selectedHistoryDate.toDateString();
                const isBirthday = date.getDate() === 17 && date.getMonth() === 11; // Dec 17
                
                return (
                  <button
                    key={idx}
                    onClick={() => workout && setSelectedHistoryDate(date)}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-all relative ${
                      workout 
                        ? isSelected ? 'bg-pink-600 text-white shadow-md scale-105' : 'bg-pink-400 text-white hover:bg-pink-500' 
                        : 'bg-gray-50 text-gray-400'
                    } ${isToday ? 'ring-2 ring-offset-2 ring-pink-400' : ''} ${isBirthday ? 'ring-2 ring-yellow-300 bg-yellow-50' : ''}`}
                  >
                    {isBirthday && !workout ? <span className="text-lg">🎂</span> : (
                        <>
                            <div className="font-bold">{date.getDate()}</div>
                            {workout && (
                            <div className="text-[10px] leading-none mt-1 opacity-90">{workout.workout}</div>
                            )}
                        </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedHistoryDate && getWorkoutForDate(selectedHistoryDate) && (
            <div className="bg-white rounded-2xl p-4 shadow-lg animate-in slide-in-from-bottom-4">
              <div className="flex justify-between items-start mb-3 border-b border-gray-100 pb-3">
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">
                    {WORKOUTS[getWorkoutForDate(selectedHistoryDate)!.workout].name}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {selectedHistoryDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                  <button
                    onClick={() => setSelectedHistoryDate(null)}
                    className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-50 rounded-full transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {getWorkoutForDate(selectedHistoryDate)!.exercises.map((ex, i) => (
                  <div key={i} className="flex justify-between items-center text-sm p-2 rounded hover:bg-gray-50">
                    <span className="font-medium text-gray-700">{ex.exercise}</span>
                    <span className="font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        {ex.weight > 0 ? `${ex.weight}lb × ` : ''}{ex.reps}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showDeleteConfirm && selectedHistoryDate && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
                <h3 className="text-xl font-bold text-gray-800 mb-3">Delete Workout?</h3>
                <p className="text-gray-600 mb-6">This action cannot be undone.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 bg-gray-200 rounded-xl p-3 text-gray-700 font-semibold active:scale-95 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => deleteWorkout(selectedHistoryDate)}
                    className="flex-1 bg-red-500 text-white rounded-xl p-3 font-semibold active:scale-95 transition-all"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (screen === 'export') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-pink-100 to-rose-100 p-4 font-sans">
        <div className="max-w-md mx-auto">
          <button
            onClick={() => setScreen('home')}
            className="mb-4 text-pink-600 flex items-center gap-2"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>

          <h2 className="text-2xl font-bold text-pink-600 mb-4">Data Management</h2>

          <div className="space-y-6">
            {/* Export Section */}
            <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                    <Download size={20} className="text-pink-500" />
                    Export Data
                </h3>
                <p className="text-sm text-gray-600 mb-4">Copy this code to save your history elsewhere.</p>
                <textarea
                    value={exportData()}
                    readOnly
                    onClick={(e) => e.currentTarget.select()}
                    className="w-full h-32 p-3 border border-gray-200 rounded-lg text-xs font-mono bg-gray-50 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none mb-2"
                />
                <button 
                    onClick={copyToClipboard}
                    className="w-full bg-pink-100 text-pink-700 font-semibold py-2 rounded-lg hover:bg-pink-200 transition-colors"
                >
                    Copy to Clipboard
                </button>
            </div>

            {/* Import Section */}
            <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                    <Upload size={20} className="text-blue-500" />
                    Import Data
                </h3>
                <p className="text-sm text-gray-600 mb-4">Paste previously exported code here to restore history.</p>
                <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder='Paste JSON here...'
                    className="w-full h-32 p-3 border border-gray-200 rounded-lg text-xs font-mono focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none mb-2"
                />
                <button 
                    onClick={importData}
                    disabled={!importText}
                    className="w-full bg-blue-100 text-blue-700 font-semibold py-2 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Restore History
                </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}