import React, { useState, useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Check,
  ChevronDown,
  Italic,
  Underline,
  Strikethrough,
  Type,
  Palette,
  CircleDot,
  LetterText,
  Baseline,
  CaseSensitive,
  Upload,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useFontStore } from '@/store/useFontStore';
import { uploadFont, isValidFontFile } from '@/lib/fontUtils';
import { createClient } from '@/lib/supabase-client';

interface TextStylePanelProps {
  selectedObject: fabric.IText | fabric.Text;
  onClose?: () => void;
}

const TextStylePanel: React.FC<TextStylePanelProps> = ({ selectedObject, onClose }) => {
  const [activeTab, setActiveTab] = useState<'font' | 'colors' | 'spacing'>('font');
  const [fontFamily, setFontFamily] = useState<string>('Arial');
  const [fontSize, setFontSize] = useState<number>(30);
  const [fillColor, setFillColor] = useState<string>('#333333');
  const [strokeColor, setStrokeColor] = useState<string>('#000000');
  const [strokeWidth, setStrokeWidth] = useState<number>(0);
  const [textAlign, setTextAlign] = useState<string>('left');
  const [fontWeight, setFontWeight] = useState<string>('normal');
  const [fontStyle, setFontStyle] = useState<string>('normal');
  const [underline, setUnderline] = useState<boolean>(false);
  const [linethrough, setLinethrough] = useState<boolean>(false);
  const [lineHeight, setLineHeight] = useState<number>(1.16);
  const [charSpacing, setCharSpacing] = useState<number>(0);
  const [textBackgroundColor, setTextBackgroundColor] = useState<string>('');
  const [opacity, setOpacity] = useState<number>(1);
  const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false);
  const [isUploadingFont, setIsUploadingFont] = useState(false);
  const [showCopyrightNotice, setShowCopyrightNotice] = useState(false);
  const [uploadedFontName, setUploadedFontName] = useState<string>('');
  const fontDropdownRef = useRef<HTMLDivElement | null>(null);
  const fontFileInputRef = useRef<HTMLInputElement | null>(null);

  // Get custom fonts from store
  const { customFonts, addFont, loadAllFonts } = useFontStore();

  // System font families available
  const systemFonts = [
    'Arial',
    'Times New Roman',
    'Courier New',
    'Georgia',
    'Verdana',
    'Helvetica',
    'Comic Sans MS',
    'Impact',
    'Trebuchet MS',
    'Palatino',
  ];

  // Initialize state from selected object
  useEffect(() => {
    if (selectedObject) {
      setFontFamily((selectedObject.fontFamily as string) || 'Arial');
      setFontSize((selectedObject.fontSize as number) || 30);
      setFillColor((selectedObject.fill as string) || '#333333');
      setStrokeColor((selectedObject.stroke as string) || '#000000');
      setStrokeWidth((selectedObject.strokeWidth as number) || 0);
      setTextAlign((selectedObject.textAlign as string) || 'left');
      setFontWeight((selectedObject.fontWeight as string) || 'normal');
      setFontStyle((selectedObject.fontStyle as string) || 'normal');
      setUnderline(selectedObject.underline || false);
      setLinethrough(selectedObject.linethrough || false);
      setLineHeight((selectedObject.lineHeight as number) || 1.16);
      setCharSpacing((selectedObject.charSpacing as number) || 0);
      setTextBackgroundColor((selectedObject.textBackgroundColor as string) || '');
      setOpacity((selectedObject.opacity as number) || 1);
    }
  }, [selectedObject]);

  useEffect(() => {
    setIsFontDropdownOpen(false);
  }, [activeTab, selectedObject]);

  useEffect(() => {
    if (!isFontDropdownOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && fontDropdownRef.current && !fontDropdownRef.current.contains(target)) {
        setIsFontDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsFontDropdownOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFontDropdownOpen]);

  // Update selected object properties
  const updateTextProperty = (property: string, value: any) => {
    if (selectedObject) {
      selectedObject.set(property as keyof fabric.IText, value);
      selectedObject.canvas?.renderAll();
    }
  };

  const handleFontFamilyChange = (value: string) => {
    setFontFamily(value);
    updateTextProperty('fontFamily', value);
  };

  const handleFontSizeChange = (value: number) => {
    setFontSize(value);
    updateTextProperty('fontSize', value);
  };

  const handleFillColorChange = (value: string) => {
    setFillColor(value);
    updateTextProperty('fill', value);
  };

  const handleStrokeColorChange = (value: string) => {
    setStrokeColor(value);
    updateTextProperty('stroke', value);
  };

  const handleStrokeWidthChange = (value: number) => {
    setStrokeWidth(value);
    updateTextProperty('strokeWidth', value);
    updateTextProperty('paintFirst', 'stroke');
  };

  const handleTextAlignChange = (value: string) => {
    setTextAlign(value);
    updateTextProperty('textAlign', value);
  };

  const toggleBold = () => {
    const newWeight = fontWeight === 'bold' ? 'normal' : 'bold';
    setFontWeight(newWeight);
    updateTextProperty('fontWeight', newWeight);
  };

  const toggleItalic = () => {
    const newStyle = fontStyle === 'italic' ? 'normal' : 'italic';
    setFontStyle(newStyle);
    updateTextProperty('fontStyle', newStyle);
  };

  const toggleUnderline = () => {
    const newUnderline = !underline;
    setUnderline(newUnderline);
    updateTextProperty('underline', newUnderline);
  };

  const toggleLinethrough = () => {
    const newLinethrough = !linethrough;
    setLinethrough(newLinethrough);
    updateTextProperty('linethrough', newLinethrough);
  };

  const handleLineHeightChange = (value: number) => {
    setLineHeight(value);
    updateTextProperty('lineHeight', value);
  };

  const handleCharSpacingChange = (value: number) => {
    setCharSpacing(value);
    updateTextProperty('charSpacing', value);
  };

  const handleTextBackgroundColorChange = (value: string) => {
    setTextBackgroundColor(value);
    updateTextProperty('textBackgroundColor', value);
  };

  const handleOpacityChange = (value: number) => {
    setOpacity(value);
    updateTextProperty('opacity', value);
  };

  // Handle font file upload
  const handleFontUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate font file
    if (!isValidFontFile(file)) {
      alert('유효하지 않은 폰트 파일입니다. 지원 형식: .ttf, .otf, .woff, .woff2');
      return;
    }

    setIsUploadingFont(true);

    try {
      const supabase = createClient();
      const result = await uploadFont(supabase, file);

      if (result.success && result.fontMetadata) {
        // Add font to store
        addFont(result.fontMetadata);

        // Load the font into the browser
        await loadAllFonts();

        // Apply the font to selected text
        handleFontFamilyChange(result.fontMetadata.fontFamily);

        // Show copyright notice modal
        setUploadedFontName(result.fontMetadata.fontFamily);
        setShowCopyrightNotice(true);
      } else {
        alert(`폰트 업로드 실패: ${result.error}`);
      }
    } catch (error) {
      console.error('Font upload error:', error);
      alert('폰트 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploadingFont(false);
      // Reset file input
      if (fontFileInputRef.current) {
        fontFileInputRef.current.value = '';
      }
    }
  };

  const handleFontUploadClick = () => {
    fontFileInputRef.current?.click();
  };

  return (
    <>
    {/* Copyright Notice Modal */}
    {showCopyrightNotice && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-2xl shadow-xl max-w-sm mx-4 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 rounded-full">
                <AlertTriangle className="size-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">저작권 안내</h3>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed mb-4">
              폰트 <span className="font-semibold">&quot;{uploadedFontName}&quot;</span>가 성공적으로 업로드되었습니다.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-gray-700 text-sm leading-relaxed">
                커스텀 폰트 사용 시 <span className="font-semibold text-amber-700">저작권 및 사용 범위에 대한 모든 책임은 사용자에게 있습니다.</span>
              </p>
              <p className="text-gray-600 text-xs mt-2">
                상업적 용도로 사용하기 전에 해당 폰트의 라이선스를 반드시 확인해 주세요.
              </p>
            </div>
            <button
              onClick={() => setShowCopyrightNotice(false)}
              className="w-full py-3 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition"
            >
              확인
            </button>
          </div>
        </div>
      </div>
    )}

    <div className="fixed inset-x-0 bottom-0 z-50 animate-slide-up">
      <div className="border-t rounded-t-2xl bg-white border-gray-200 shadow-2xl h-[34vh] flex flex-col px-4">
        {/* Header with Tabs */}
        <div className="shrink-0 sticky top-0 border-b border-gray-100">
          <div className='py-3 w-10 mx-auto'>
            <hr className='border-2 border-black/20 rounded-full'/>
          </div>

          {/* Tabs */}
          <div className="flex">
            <button
              onClick={() => setActiveTab('font')}
              className={`flex-1 py-2 px-4 text-sm font-medium ${
                activeTab === 'font'
                  ? 'bg-black text-white rounded-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              폰트
            </button>
            <button
              onClick={() => setActiveTab('colors')}
              className={`flex-1 py-2 px-4 text-sm font-medium ${
                activeTab === 'colors'
                  ? 'bg-black text-white rounded-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              색상
            </button>
            <button
              onClick={() => setActiveTab('spacing')}
              className={`flex-1 py-2 px-4 text-sm font-medium ${
                activeTab === 'spacing'
                  ? 'bg-black text-white rounded-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              간격
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Font Tab */}
          {activeTab === 'font' && (
            <>
              {/* Font Family */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Type className="size-4" />
                  글꼴
                </label>
                <div ref={fontDropdownRef} className="relative">
                  <button
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={isFontDropdownOpen}
                    onClick={() => setIsFontDropdownOpen((prev) => !prev)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent flex items-center justify-between gap-2"
                  >
                    <span className="truncate" style={{ fontFamily }}>
                      {fontFamily}
                    </span>
                    <ChevronDown className="size-4 shrink-0 text-gray-600" />
                  </button>

                  {isFontDropdownOpen && (
                    <div
                      role="listbox"
                      aria-label="Font family"
                      className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg"
                    >
                      {/* Font Upload Button */}
                      <div className="sticky top-0 bg-white border-b border-gray-200 p-2">
                        <button
                          type="button"
                          onClick={handleFontUploadClick}
                          disabled={isUploadingFont}
                          className="w-full px-3 py-2 flex items-center gap-2 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Upload className="size-4 text-blue-600" />
                          <span className="flex-1 text-sm font-medium text-blue-600">
                            {isUploadingFont ? '업로드 중...' : '커스텀 폰트 업로드'}
                          </span>
                        </button>
                        <input
                          ref={fontFileInputRef}
                          type="file"
                          accept=".ttf,.otf,.woff,.woff2"
                          onChange={handleFontUpload}
                          className="hidden"
                        />
                      </div>

                      {/* Custom Fonts */}
                      {customFonts.length > 0 && (
                        <div className="border-b border-gray-100">
                          <div className="px-3 py-1 text-xs font-semibold text-gray-500 bg-gray-50">
                            커스텀 폰트
                          </div>
                          {customFonts.map((customFont) => {
                            const isSelected = customFont.fontFamily === fontFamily;
                            return (
                              <button
                                key={customFont.fontFamily}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => {
                                  handleFontFamilyChange(customFont.fontFamily);
                                  setIsFontDropdownOpen(false);
                                }}
                                className={`w-full px-3 py-2 flex items-center gap-3 text-left hover:bg-gray-50 ${
                                  isSelected ? 'bg-gray-100' : ''
                                }`}
                              >
                                <span className="w-4 shrink-0">
                                  {isSelected ? <Check className="size-4" /> : null}
                                </span>
                                <span className="flex-1 min-w-0 truncate" style={{ fontFamily: customFont.fontFamily }}>
                                  {customFont.fontFamily}
                                </span>
                                <span className="shrink-0 text-sm text-gray-500" style={{ fontFamily: customFont.fontFamily }}>
                                  Aa 가나다
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* System Fonts */}
                      {systemFonts.length > 0 && (
                        <div>
                          <div className="px-3 py-1 text-xs font-semibold text-gray-500 bg-gray-50">
                            시스템 폰트
                          </div>
                          {systemFonts.map((font) => {
                            const isSelected = font === fontFamily;
                            return (
                              <button
                                key={font}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => {
                                  handleFontFamilyChange(font);
                                  setIsFontDropdownOpen(false);
                                }}
                                className={`w-full px-3 py-2 flex items-center gap-3 text-left hover:bg-gray-50 ${
                                  isSelected ? 'bg-gray-100' : ''
                                }`}
                              >
                                <span className="w-4 shrink-0">
                                  {isSelected ? <Check className="size-4" /> : null}
                                </span>
                                <span className="flex-1 min-w-0 truncate" style={{ fontFamily: font }}>
                                  {font}
                                </span>
                                <span className="shrink-0 text-sm text-gray-500" style={{ fontFamily: font }}>
                                  Aa 가나다
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Font Size */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <CaseSensitive className="size-4" />
                  크기: {fontSize}px
                </label>
                <input
                  type="range"
                  min="8"
                  max="200"
                  value={fontSize}
                  onChange={(e) => handleFontSizeChange(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Text Alignment */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">정렬</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleTextAlignChange('left')}
                    className={`flex-1 p-2 rounded-lg border transition ${
                      textAlign === 'left'
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <AlignLeft className="size-5 mx-auto" />
                  </button>
                  <button
                    onClick={() => handleTextAlignChange('center')}
                    className={`flex-1 p-2 rounded-lg border transition ${
                      textAlign === 'center'
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <AlignCenter className="size-5 mx-auto" />
                  </button>
                  <button
                    onClick={() => handleTextAlignChange('right')}
                    className={`flex-1 p-2 rounded-lg border transition ${
                      textAlign === 'right'
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <AlignRight className="size-5 mx-auto" />
                  </button>
                  <button
                    onClick={() => handleTextAlignChange('justify')}
                    className={`flex-1 p-2 rounded-lg border transition ${
                      textAlign === 'justify'
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <AlignJustify className="size-5 mx-auto" />
                  </button>
                </div>
              </div>

              {/* Text Decorations */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">텍스트 스타일</label>
                <div className="flex gap-2">
                  <button
                    onClick={toggleBold}
                    className={`flex-1 p-2 rounded-lg border transition ${
                      fontWeight === 'bold'
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Bold className="size-5 mx-auto" />
                  </button>
                  <button
                    onClick={toggleItalic}
                    className={`flex-1 p-2 rounded-lg border transition ${
                      fontStyle === 'italic'
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Italic className="size-5 mx-auto" />
                  </button>
                  <button
                    onClick={toggleUnderline}
                    className={`flex-1 p-2 rounded-lg border transition ${
                      underline
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Underline className="size-5 mx-auto" />
                  </button>
                  <button
                    onClick={toggleLinethrough}
                    className={`flex-1 p-2 rounded-lg border transition ${
                      linethrough
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Strikethrough className="size-5 mx-auto" />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Colors Tab */}
          {activeTab === 'colors' && (
            <>
              {/* Fill Color */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Palette className="size-4" />
                  글자 색상
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={fillColor}
                    onChange={(e) => handleFillColorChange(e.target.value)}
                    className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={fillColor}
                    onChange={(e) => handleFillColorChange(e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Stroke Color */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <CircleDot className="size-4" />
                  테두리 색상
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={strokeColor}
                    onChange={(e) => handleStrokeColorChange(e.target.value)}
                    className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={strokeColor}
                    onChange={(e) => handleStrokeColorChange(e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Stroke Width */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  테두리 두께: {strokeWidth}px
                </label>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={strokeWidth}
                  onChange={(e) => handleStrokeWidthChange(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Text Background Color */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  배경 색상
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={textBackgroundColor || '#ffffff'}
                    onChange={(e) => handleTextBackgroundColorChange(e.target.value)}
                    className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={textBackgroundColor}
                    onChange={(e) => handleTextBackgroundColorChange(e.target.value)}
                    placeholder="투명"
                    className="flex-1 p-2 border border-gray-300 rounded-lg"
                  />
                  <button
                    onClick={() => handleTextBackgroundColorChange('')}
                    className="px-3 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg transition"
                  >
                    제거
                  </button>
                </div>
              </div>

              {/* Opacity */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  투명도: {Math.round(opacity * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={opacity}
                  onChange={(e) => handleOpacityChange(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </>
          )}

          {/* Spacing Tab */}
          {activeTab === 'spacing' && (
            <>
              {/* Line Height */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Baseline className="size-4" />
                  줄 간격: {lineHeight.toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={lineHeight}
                  onChange={(e) => handleLineHeightChange(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Character Spacing */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <LetterText className="size-4" />
                  자간: {charSpacing}
                </label>
                <input
                  type="range"
                  min="-200"
                  max="800"
                  step="10"
                  value={charSpacing}
                  onChange={(e) => handleCharSpacingChange(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
    </>
  );
};

export default TextStylePanel;
