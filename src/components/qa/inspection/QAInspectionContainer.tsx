// QA Inspection Container - Main router for inspection workflow
import React, { useState } from 'react';
import QAInspectionDashboard from './QAInspectionDashboard';
import InspectionChecklistView from './InspectionChecklistView';
import type { InspectionSection } from '../../../types/inspection';

interface QAInspectionContainerProps {
  userEmail: string;
  userName: string;
}

type View =
  | { type: 'dashboard' }
  | { type: 'checklist'; inspectionId: string; vin: string; section: InspectionSection };

const QAInspectionContainer: React.FC<QAInspectionContainerProps> = ({
  userEmail,
  userName,
}) => {
  const [view, setView] = useState<View>({ type: 'dashboard' });

  const handleStartInspection = (inspectionId: string, vin: string, section: InspectionSection) => {
    setView({ type: 'checklist', inspectionId, vin, section });
  };

  const handleBackToDashboard = () => {
    setView({ type: 'dashboard' });
  };

  const handleCompleteSection = () => {
    // Go back to dashboard after completing a section
    setView({ type: 'dashboard' });
  };

  if (view.type === 'checklist') {
    return (
      <InspectionChecklistView
        inspectionId={view.inspectionId}
        section={view.section}
        userEmail={userEmail}
        userName={userName}
        onBack={handleBackToDashboard}
        onComplete={handleCompleteSection}
      />
    );
  }

  return (
    <QAInspectionDashboard
      userEmail={userEmail}
      userName={userName}
      onStartInspection={handleStartInspection}
    />
  );
};

export default QAInspectionContainer;
