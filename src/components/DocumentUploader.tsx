import React, { useEffect, useRef, useState } from 'react';
import { IonIcon, IonButton } from '@ionic/react';
import { closeCircleOutline, attachOutline } from 'ionicons/icons';

interface DocumentUploaderProps {
  onFileUpload?: (file: File) => void;
  resetTrigger?: unknown; // Changing this prop will reset the attached file
}

const chipStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  padding: '4px 10px 4px 8px',
  fontSize: 14,
  color: 'rgba(255,255,255,0.85)',
  marginRight: 8,
  marginBottom: 4,
  maxWidth: 160,
  minWidth: 'fit-content',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  boxShadow: 'none',
  cursor: 'default',
  flexShrink: 0  // Prevent chips from shrinking
};

const fileListContainerStyle: React.CSSProperties = {
  position: 'absolute',
  top: 12,
  left: 16,
  right: 16,
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  flexWrap: 'nowrap',
  overflowX: 'auto',
  overflowY: 'hidden',
  gap: 0,
  zIndex: 2,
  msOverflowStyle: 'none',  // IE
  scrollbarWidth: 'none'    // Firefox
};

// Add a style tag for webkit scrollbar
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  .file-list-container::-webkit-scrollbar {
    display: none;
  }
`;
document.head.appendChild(styleSheet);

const DocumentUploader: React.FC<DocumentUploaderProps> = ({ onFileUpload, resetTrigger }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  // Reset attached files when resetTrigger changes
  useEffect(() => {
    console.log('Reset trigger changed, clearing files');
    setAttachedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [resetTrigger]);

  //open file input from button click
  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  // when file is choose by user
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files).filter(
        file => !attachedFiles.some(f => f.name === file.name && f.size === file.size)
      );
      console.log('Adding new files:', newFiles.map(f => f.name));
      setAttachedFiles(prev => [...prev, ...newFiles]);
      if (onFileUpload) {
        newFiles.forEach(file => onFileUpload(file));
      }
      e.target.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    console.log('Removing file at index:', index);
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <>
      {/* Upload button */}
      <div style={{ display: 'inline-flex', alignItems: 'center' }}>
        <IonButton fill="clear" onClick={handleButtonClick} className="upload-btn">
          <IonIcon icon={attachOutline} slot="icon-only" />
        </IonButton>
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={handleFileChange}
          multiple
        />
      </div>
      {/* File chips row inside the message box */}
      {attachedFiles.length > 0 && (
        <div style={fileListContainerStyle} className="file-list-container">
          {attachedFiles.map((file, idx) => (
            <span key={file.name + file.size} style={chipStyle}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 110 }}>{file.name}</span>
              <IonButton fill="clear" size="small" onClick={() => handleRemoveFile(idx)} style={{ marginLeft: 2, color: 'rgba(255,255,255,0.5)', '--padding-start': '0', '--padding-end': '0', '--background': 'transparent', '--box-shadow': 'none' } as React.CSSProperties}>
                <IonIcon icon={closeCircleOutline} style={{ fontSize: 18 }} />
              </IonButton>
            </span>
          ))}
        </div>
      )}
    </>
  );
};

export default DocumentUploader; 