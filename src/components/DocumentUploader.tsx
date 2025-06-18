import React, { useEffect, useRef, useState } from 'react';
import { IonIcon, IonButton } from '@ionic/react';
import { closeCircleOutline, attachOutline } from 'ionicons/icons';
import * as pdfjsLib from 'pdfjs-dist';
import { TextItem } from 'pdfjs-dist/types/src/display/api';
import mammoth from 'mammoth';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface DocumentUploaderProps {
  onFileUpload?: (file: File, formattedContent?: string) => void;
  onFileRemove?: (file: File) => void;
  resetTrigger?: unknown; 
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
  flexShrink: 0  
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
  msOverflowStyle: 'none', 
  scrollbarWidth: 'none'   
};

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  .file-list-container::-webkit-scrollbar {
    display: none;
  }
`;
document.head.appendChild(styleSheet);

const DocumentUploader: React.FC<DocumentUploaderProps> = ({ onFileUpload, onFileRemove, resetTrigger }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  useEffect(() => {
    setAttachedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [resetTrigger]);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const fileName = file.name.toLowerCase();
      const isTextFile = file.type === 'text/plain' || fileName.endsWith('.txt');
      const isJsonFile = file.type === 'application/json' || fileName.endsWith('.json');
      const isPdfFile = file.type === 'application/pdf' || fileName.endsWith('.pdf');
      const isDocxFile = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                        fileName.endsWith('.docx') || fileName.endsWith('.doc');
      const isCsvFile = file.type === 'text/csv' || fileName.endsWith('.csv');
      const isXmlFile = file.type === 'text/xml' || fileName.endsWith('.xml');

      if (isTextFile || isJsonFile || isCsvFile || isXmlFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          resolve(content);
        };
        reader.onerror = () => reject(new Error('Error reading text file'));
        reader.readAsText(file);
      } else if (isPdfFile) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = '';
            
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              const pageText = textContent.items
                .filter((item): item is TextItem => 'str' in item)
                .map(item => item.str)
                .join(' ');
              fullText += pageText + '\n\n';
            }
            
            resolve(fullText);
          } catch (error) {
            console.error('Error reading PDF:', error);
            reject(error);
          }
        };
        reader.onerror = () => reject(new Error('Error reading PDF file'));
        reader.readAsArrayBuffer(file);
      } else if (isDocxFile) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            const result = await mammoth.extractRawText({ arrayBuffer });
            resolve(result.value);
          } catch (error) {
            console.error('Error reading DOCX:', error);
            reject(error);
          }
        };
        reader.onerror = () => reject(new Error('Error reading DOCX file'));
        reader.readAsArrayBuffer(file);
      } else {
        resolve('');
      }
    });
  };

  const formatFileContent = (file: File, content: string): string => {
    if (!content) {
      return `Document: ${file.name} (${(file.size / 1024).toFixed(2)} KB) - Could not read content`;
    }
    
    const fileName = file.name;
    const fileSize = (file.size / 1024).toFixed(2) + ' KB';
    const fileType = fileName.split('.').pop()?.toUpperCase() || 'UNKNOWN';
    
    return `Document: ${fileName} (${fileSize}, ${fileType})\nContent:\n${content}`;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files).filter(
        file => !attachedFiles.some(f => f.name === file.name && f.size === file.size)
      );
      
      setAttachedFiles(prev => [...prev, ...newFiles]);
      
      if (onFileUpload) {
        for (const file of newFiles) {
          try {
            const content = await readFileContent(file);
            const formattedContent = formatFileContent(file, content);
            onFileUpload(file, formattedContent);
          } catch (error) {
            console.error('Error reading file:', error);
            onFileUpload(file, ''); 
          }
        }
      }
      
      e.target.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    const fileToRemove = attachedFiles[index];
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
    if (onFileRemove && fileToRemove) {
      onFileRemove(fileToRemove);
    }
  };

  return (
    <>
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
          accept=".txt,.pdf,.docx,.doc,.json,.csv,.xml"
        />
      </div>
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