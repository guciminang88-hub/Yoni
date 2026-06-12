import React, { useEffect, useState } from 'react';
import { Languages } from 'lucide-react';

export function LanguageTool() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (document.getElementById('google-translate-script')) {
      setIsLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-translate-script';
    script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    document.body.appendChild(script);

    (window as any).googleTranslateElementInit = () => {
      new (window as any).google.translate.TranslateElement(
        { 
          pageLanguage: 'id', 
          includedLanguages: 'id,en',
          autoDisplay: false
        },
        'google_translate_element'
      );
      setIsLoaded(true);
    };
  }, []);

  return (
    <div className="flex items-center gap-1">
      <Languages size={13} className="text-white/80" />
      <div 
        id="google_translate_element" 
        className="-mt-0.5"
      />
    </div>
  );
}
