import React, { useState, useEffect } from 'react';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonSelect,
  IonSelectOption,
  IonItem,
  IonLabel,
  IonList,
  IonAccordion,
  IonAccordionGroup,
  IonBadge,
  IonToggle
} from '@ionic/react';
import DatabaseDebugger from '../services/db/DatabaseDebugger';

const DatabaseInspector: React.FC = () => {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableData, setTableData] = useState<any[]>([]);
  const [tableSchema, setTableSchema] = useState<any[]>([]);
  const [recordCount, setRecordCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showRawJson, setShowRawJson] = useState<boolean>(false);

  const dbDebugger = DatabaseDebugger.getInstance();

  // Load tables on component mount
  useEffect(() => {
    loadTables();
  }, []);

  // Load table data when a table is selected
  useEffect(() => {
    if (selectedTable) {
      loadTableData();
    }
  }, [selectedTable]);

  const loadTables = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const tableList = await dbDebugger.getTables();
      setTables(tableList);
      setIsLoading(false);
    } catch (err) {
      setError(`Error loading tables: ${err instanceof Error ? err.message : String(err)}`);
      setIsLoading(false);
    }
  };

  const loadTableData = async () => {
    if (!selectedTable) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Get table schema
      const schema = await dbDebugger.getTableSchema(selectedTable);
      setTableSchema(schema);
      
      // Get record count
      const count = await dbDebugger.getRecordCount(selectedTable);
      setRecordCount(count);
      
      // Get table data (limited to 100 records)
      const data = await dbDebugger.getAllRecords(selectedTable);
      setTableData(data);
      
      setIsLoading(false);
    } catch (err) {
      setError(`Error loading table data: ${err instanceof Error ? err.message : String(err)}`);
      setIsLoading(false);
    }
  };

  const refreshData = () => {
    if (selectedTable) {
      loadTableData();
    } else {
      loadTables();
    }
  };

  const renderTableSchema = () => {
    if (!tableSchema.length) return null;
    
    return (
      <IonCard>
        <IonCardHeader>
          <IonCardTitle>Table Schema</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <IonList>
            {tableSchema.map((column, index) => (
              <IonItem key={index}>
                <IonLabel>
                  <h2>{column.name}</h2>
                  <p>Type: {column.type}</p>
                </IonLabel>
                {column.pk === 1 && <IonBadge color="primary">Primary Key</IonBadge>}
                {column.notnull === 1 && <IonBadge color="warning">Not Null</IonBadge>}
              </IonItem>
            ))}
          </IonList>
        </IonCardContent>
      </IonCard>
    );
  };

  const renderTableData = () => {
    if (!tableData.length) {
      return (
        <IonCard>
          <IonCardContent>No data found in this table.</IonCardContent>
        </IonCard>
      );
    }

    if (showRawJson) {
      return (
        <IonCard>
          <IonCardContent>
            <pre style={{ overflowX: 'auto' }}>
              {JSON.stringify(tableData, null, 2)}
            </pre>
          </IonCardContent>
        </IonCard>
      );
    }

    return (
      <IonAccordionGroup>
        {tableData.map((row, index) => (
          <IonAccordion key={index} value={`row-${index}`}>
            <IonItem slot="header">
              <IonLabel>
                Row {index + 1}
                {row.id && <span> (ID: {row.id})</span>}
              </IonLabel>
            </IonItem>
            <IonList slot="content">
              {Object.entries(row).map(([key, value]) => (
                <IonItem key={key}>
                  <IonLabel>
                    <strong>{key}:</strong> {value !== null ? String(value) : 'null'}
                  </IonLabel>
                </IonItem>
              ))}
            </IonList>
          </IonAccordion>
        ))}
      </IonAccordionGroup>
    );
  };

  return (
    <div>
      <IonCard>
        <IonCardHeader>
          <IonCardTitle>Database Inspector</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <IonItem>
            <IonLabel>Select Table</IonLabel>
            <IonSelect 
              value={selectedTable} 
              onIonChange={(e) => setSelectedTable(e.detail.value)}
              placeholder="Select a table"
            >
              {tables.map((table) => (
                <IonSelectOption key={table} value={table}>
                  {table}
                </IonSelectOption>
              ))}
            </IonSelect>
          </IonItem>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
            <IonButton onClick={refreshData} disabled={isLoading}>
              {isLoading ? 'Loading...' : 'Refresh'}
            </IonButton>
            
            {selectedTable && (
              <IonItem lines="none">
                <IonLabel>Show Raw JSON</IonLabel>
                <IonToggle 
                  checked={showRawJson} 
                  onIonChange={(e) => setShowRawJson(e.detail.checked)} 
                />
              </IonItem>
            )}
          </div>
          
          {error && (
            <div style={{ color: 'red', margin: '1rem 0' }}>
              {error}
            </div>
          )}
          
          {selectedTable && (
            <div style={{ marginTop: '1rem' }}>
              <IonBadge color="medium">
                {recordCount} {recordCount === 1 ? 'record' : 'records'}
              </IonBadge>
            </div>
          )}
        </IonCardContent>
      </IonCard>
      
      {selectedTable && renderTableSchema()}
      {selectedTable && renderTableData()}
    </div>
  );
};

export default DatabaseInspector; 