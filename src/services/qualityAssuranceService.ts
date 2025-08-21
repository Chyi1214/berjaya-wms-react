// Quality Assurance Service - v4.1.0
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  QAChecklist, 
  QACheckItem, 
  QAInspection, 
  QACheckResult, 
  QACheckStatus,
  Car 
} from '../types';
import { prepareForFirestore } from '../utils/firestore';

class QualityAssuranceService {
  private checklistsCollection = collection(db, 'qaChecklists');
  private inspectionsCollection = collection(db, 'qaInspections');

  // Checklist Management
  async createChecklist(checklist: Omit<QAChecklist, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const id = doc(this.checklistsCollection).id;
      const now = new Date();
      
      const checklistData: QAChecklist = {
        ...checklist,
        id,
        totalItems: checklist.items.length,
        requiredItems: checklist.items.filter(item => item.isRequired).length,
        createdAt: now,
        updatedAt: now
      };

      const cleanData = prepareForFirestore(checklistData);
      await setDoc(doc(this.checklistsCollection, id), cleanData);
      
      console.log('✅ QA Checklist created:', id);
      return id;
    } catch (error) {
      console.error('Failed to create QA checklist:', error);
      throw error;
    }
  }

  async getChecklist(id: string): Promise<QAChecklist | null> {
    try {
      const checklistDoc = await getDoc(doc(this.checklistsCollection, id));
      if (checklistDoc.exists()) {
        const data = checklistDoc.data();
        return {
          ...data,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate()
        } as QAChecklist;
      }
      return null;
    } catch (error) {
      console.error('Failed to get QA checklist:', error);
      return null;
    }
  }

  async getAllChecklists(): Promise<QAChecklist[]> {
    try {
      const querySnapshot = await getDocs(
        query(this.checklistsCollection, orderBy('createdAt', 'desc'))
      );
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate()
        } as QAChecklist;
      });
    } catch (error) {
      console.error('Failed to get QA checklists:', error);
      return [];
    }
  }

  async updateChecklist(id: string, updates: Partial<QAChecklist>): Promise<void> {
    try {
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };

      if (updates.items) {
        updateData.totalItems = updates.items.length;
        updateData.requiredItems = updates.items.filter(item => item.isRequired).length;
      }

      const cleanData = prepareForFirestore(updateData);
      await updateDoc(doc(this.checklistsCollection, id), cleanData);
      
      console.log('✅ QA Checklist updated:', id);
    } catch (error) {
      console.error('Failed to update QA checklist:', error);
      throw error;
    }
  }

  async deleteChecklist(id: string): Promise<void> {
    try {
      await deleteDoc(doc(this.checklistsCollection, id));
      console.log('✅ QA Checklist deleted:', id);
    } catch (error) {
      console.error('Failed to delete QA checklist:', error);
      throw error;
    }
  }

  // Find appropriate checklist for a car
  async getChecklistForCar(car: Car): Promise<QAChecklist | null> {
    try {
      const checklists = await this.getAllChecklists();
      
      // Find checklist that matches car type
      const matchingChecklist = checklists.find(checklist => 
        checklist.carTypes.includes(car.type) || 
        checklist.carTypes.includes('All') ||
        checklist.carTypes.length === 0
      );

      return matchingChecklist || (checklists.length > 0 ? checklists[0] : null);
    } catch (error) {
      console.error('Failed to find checklist for car:', error);
      return null;
    }
  }

  // Inspection Management
  async startInspection(
    car: Car, 
    checklistId: string, 
    inspectorEmail: string, 
    inspectorName: string
  ): Promise<string> {
    try {
      const checklist = await this.getChecklist(checklistId);
      if (!checklist) {
        throw new Error('Checklist not found');
      }

      const inspectionId = doc(this.inspectionsCollection).id;
      const now = new Date();

      const inspection: QAInspection = {
        id: inspectionId,
        vin: car.vin,
        checklistId,
        checklistName: checklist.name,
        status: 'in_progress',
        overallResult: 'pending',
        totalItems: checklist.totalItems,
        checkedItems: 0,
        passedItems: 0,
        failedItems: 0,
        requiredItemsPassed: 0,
        results: [],
        startedAt: now,
        inspectorEmail,
        inspectorName,
        carType: car.type,
        carColor: car.color,
        carSeries: car.series,
        currentZone: car.currentZone || undefined
      };

      const cleanData = prepareForFirestore(inspection);
      await setDoc(doc(this.inspectionsCollection, inspectionId), cleanData);
      
      console.log('✅ QA Inspection started:', inspectionId, 'for car:', car.vin);
      return inspectionId;
    } catch (error) {
      console.error('Failed to start QA inspection:', error);
      throw error;
    }
  }

  async updateCheckResult(
    inspectionId: string,
    itemId: string,
    status: QACheckStatus,
    notes: string,
    checkedBy: string
  ): Promise<void> {
    try {
      const inspection = await this.getInspection(inspectionId);
      if (!inspection) {
        throw new Error('Inspection not found');
      }

      const checklist = await this.getChecklist(inspection.checklistId);
      if (!checklist) {
        throw new Error('Checklist not found');
      }

      // Update or add result
      const existingResultIndex = inspection.results.findIndex(r => r.itemId === itemId);
      const checkResult: QACheckResult = {
        itemId,
        status,
        notes,
        checkedAt: new Date(),
        checkedBy
      };

      let updatedResults: QACheckResult[];
      if (existingResultIndex >= 0) {
        updatedResults = [...inspection.results];
        updatedResults[existingResultIndex] = checkResult;
      } else {
        updatedResults = [...inspection.results, checkResult];
      }

      // Recalculate statistics
      const checkedItems = updatedResults.length;
      const passedItems = updatedResults.filter(r => r.status === QACheckStatus.PASSED).length;
      const failedItems = updatedResults.filter(r => r.status === QACheckStatus.FAILED).length;
      
      const requiredItemsPassed = updatedResults.filter(result => {
        const checkItem = checklist.items.find(item => item.id === result.itemId);
        return checkItem?.isRequired && result.status === QACheckStatus.PASSED;
      }).length;

      // Determine overall result
      let overallResult: 'pass' | 'fail' | 'pending' = 'pending';
      let inspectionStatus: 'in_progress' | 'completed' | 'failed' = 'in_progress';

      if (checkedItems === checklist.totalItems) {
        // All items checked
        const requiredItemsFailed = checklist.items.filter(item => {
          const result = updatedResults.find(r => r.itemId === item.id);
          return item.isRequired && result?.status === QACheckStatus.FAILED;
        }).length;

        if (requiredItemsFailed > 0) {
          overallResult = 'fail';
          inspectionStatus = 'failed';
        } else {
          overallResult = 'pass';
          inspectionStatus = 'completed';
        }
      }

      const updates = {
        results: updatedResults,
        checkedItems,
        passedItems,
        failedItems,
        requiredItemsPassed,
        overallResult,
        status: inspectionStatus,
        ...(inspectionStatus === 'completed' || inspectionStatus === 'failed' ? {
          completedAt: new Date()
        } : {})
      };

      const cleanData = prepareForFirestore(updates);
      await updateDoc(doc(this.inspectionsCollection, inspectionId), cleanData);
      
      console.log('✅ QA Check result updated:', inspectionId, itemId, status);
    } catch (error) {
      console.error('Failed to update QA check result:', error);
      throw error;
    }
  }

  async getInspection(id: string): Promise<QAInspection | null> {
    try {
      const inspectionDoc = await getDoc(doc(this.inspectionsCollection, id));
      if (inspectionDoc.exists()) {
        const data = inspectionDoc.data();
        return {
          ...data,
          startedAt: data.startedAt.toDate(),
          completedAt: data.completedAt?.toDate(),
          results: data.results.map((result: Record<string, any>) => ({
            ...result,
            checkedAt: result.checkedAt.toDate()
          }))
        } as QAInspection;
      }
      return null;
    } catch (error) {
      console.error('Failed to get QA inspection:', error);
      return null;
    }
  }

  async getInspectionsForCar(vin: string): Promise<QAInspection[]> {
    try {
      const querySnapshot = await getDocs(
        query(
          this.inspectionsCollection, 
          where('vin', '==', vin),
          orderBy('startedAt', 'desc')
        )
      );
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          startedAt: data.startedAt.toDate(),
          completedAt: data.completedAt?.toDate(),
          results: data.results.map((result: Record<string, any>) => ({
            ...result,
            checkedAt: result.checkedAt.toDate()
          }))
        } as QAInspection;
      });
    } catch (error) {
      console.error('Failed to get inspections for car:', error);
      return [];
    }
  }

  async getTodayInspections(): Promise<QAInspection[]> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const querySnapshot = await getDocs(
        query(
          this.inspectionsCollection,
          where('startedAt', '>=', Timestamp.fromDate(today)),
          where('startedAt', '<', Timestamp.fromDate(tomorrow)),
          orderBy('startedAt', 'desc')
        )
      );

      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          startedAt: data.startedAt.toDate(),
          completedAt: data.completedAt?.toDate(),
          results: data.results.map((result: Record<string, any>) => ({
            ...result,
            checkedAt: result.checkedAt.toDate()
          }))
        } as QAInspection;
      });
    } catch (error) {
      console.error('Failed to get today inspections:', error);
      return [];
    }
  }

  // Create default checklist for testing
  async createDefaultChecklist(createdBy: string): Promise<string> {
    const defaultItems: QACheckItem[] = [
      { id: '1', name: 'Engine properly mounted', category: 'Engine', isRequired: true, order: 1 },
      { id: '2', name: 'Engine oil level correct', category: 'Engine', isRequired: true, order: 2 },
      { id: '3', name: 'All engine belts tight', category: 'Engine', isRequired: false, order: 3 },
      { id: '4', name: 'Body panels aligned', category: 'Body', isRequired: true, order: 4 },
      { id: '5', name: 'Paint finish quality', category: 'Body', isRequired: false, order: 5 },
      { id: '6', name: 'Doors open/close smoothly', category: 'Body', isRequired: true, order: 6 },
      { id: '7', name: 'All lights functional', category: 'Electrical', isRequired: true, order: 7 },
      { id: '8', name: 'Dashboard electronics work', category: 'Electrical', isRequired: true, order: 8 },
      { id: '9', name: 'Air conditioning works', category: 'Electrical', isRequired: false, order: 9 },
      { id: '10', name: 'Final inspection complete', category: 'Final', isRequired: true, order: 10 }
    ];

    return await this.createChecklist({
      name: 'Basic Car Quality Checklist',
      description: 'Standard quality checks for all car types',
      carTypes: ['All'],
      version: 1,
      items: defaultItems,
      totalItems: 0, // Will be calculated
      requiredItems: 0, // Will be calculated
      createdBy
    });
  }

  // Generate CSV export data for checklists
  getChecklistCSVData(checklists: QAChecklist[]): string {
    const headers = ['ID', 'Name', 'Description', 'Car Types', 'Version', 'Total Items', 'Required Items', 'Created By', 'Created At'];
    
    const rows = checklists.map(checklist => [
      checklist.id,
      checklist.name,
      checklist.description || '',
      checklist.carTypes.join(';'),
      checklist.version.toString(),
      checklist.totalItems.toString(),
      checklist.requiredItems.toString(),
      checklist.createdBy,
      checklist.createdAt.toISOString().split('T')[0]
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  // Generate CSV export data for inspections
  getInspectionsCSVData(inspections: QAInspection[]): string {
    const headers = [
      'Inspection ID', 'VIN', 'Car Type', 'Car Color', 'Checklist Name',
      'Status', 'Overall Result', 'Items Checked', 'Items Passed', 'Items Failed',
      'Inspector', 'Started At', 'Completed At', 'Duration (minutes)'
    ];
    
    const rows = inspections.map(inspection => {
      const duration = inspection.completedAt ? 
        Math.round((inspection.completedAt.getTime() - inspection.startedAt.getTime()) / 60000) : 
        '';

      return [
        inspection.id,
        inspection.vin,
        inspection.carType,
        inspection.carColor,
        inspection.checklistName,
        inspection.status,
        inspection.overallResult,
        inspection.checkedItems.toString(),
        inspection.passedItems.toString(),
        inspection.failedItems.toString(),
        inspection.inspectorName,
        inspection.startedAt.toISOString().replace('T', ' ').split('.')[0],
        inspection.completedAt?.toISOString().replace('T', ' ').split('.')[0] || '',
        duration.toString()
      ];
    });

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}

export const qualityAssuranceService = new QualityAssuranceService();