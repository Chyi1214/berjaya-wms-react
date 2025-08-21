import { Car, WorkStation, WorkerActivity, ProductionStats } from '../../../types';

export const formatTime = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
};

export const getProductionStats = (
  cars: Car[], 
  workStations: WorkStation[], 
  workerActivities: WorkerActivity[]
): ProductionStats => {
  const today = new Date().toISOString().split('T')[0];
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  const todayCars = cars.filter(car => car.createdAt >= todayStart);
  const carsCompleted = todayCars.filter(car => car.completedAt).length;
  const carsInProgress = cars.filter(car => car.currentZone !== null).length;
  
  const completedCars = cars.filter(car => car.completedAt);
  const totalProductionMinutes = completedCars.reduce((sum, car) => sum + (car.totalProductionTime || 0), 0);
  const averageProductionTime = completedCars.length > 0 ? Math.round(totalProductionMinutes / completedCars.length) : 0;

  const zoneStats = workStations.map(station => ({
    zoneId: station.zoneId,
    carsProcessed: station.carsProcessedToday,
    averageTimePerCar: station.averageProcessingTime,
    currentlyOccupied: station.currentCar !== undefined
  }));

  const todayActivities = workerActivities.filter(activity => 
    activity.checkedInAt >= todayStart
  );

  const workerMap = new Map<string, { name: string; totalMinutes: number; cars: Set<string> }>();
  todayActivities.forEach(activity => {
    if (!workerMap.has(activity.workerEmail)) {
      workerMap.set(activity.workerEmail, {
        name: activity.workerName,
        totalMinutes: 0,
        cars: new Set()
      });
    }
    const worker = workerMap.get(activity.workerEmail)!;
    worker.totalMinutes += activity.totalMinutes || 0;
    if (activity.workedOnCar) {
      worker.cars.add(activity.workedOnCar.vin);
    }
  });

  const workerStats = Array.from(workerMap.entries()).map(([email, data]) => ({
    email,
    displayName: data.name,
    hoursWorked: Math.round((data.totalMinutes / 60) * 100) / 100,
    carsWorkedOn: data.cars.size
  }));

  return {
    date: today,
    carsStarted: todayCars.length,
    carsCompleted,
    carsInProgress,
    averageProductionTime,
    totalProductionMinutes,
    zoneStats,
    workerStats,
    lastCalculated: new Date()
  };
};