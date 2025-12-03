import React, { useState } from 'react'
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react'

function HelpAssistant() {
  const [openSection, setOpenSection] = useState(null)

  const faqSections = [
    {
      id: 'weather-terms',
      title: 'Weather Terms Explained',
      content: `
        • Temperature: How hot or cold the air is
        • Humidity: Amount of moisture in the air
        • Pressure: Atmospheric pressure in hectopascals
        • Wind Speed: How fast the wind is blowing
        • UV Index: Strength of sunburn-producing UV radiation
        • Visibility: How far you can see clearly
      `
    },
    {
      id: 'using-app',
      title: 'How to Use the App',
      content: `
        • View current weather on the main dashboard
        • Check 7-day forecast for planning
        • Save favorite locations for quick access
        • Use voice commands for hands-free operation
        • Enable notifications for weather alerts
        • Use SOS feature in emergencies
      `
    },
    {
      id: 'sos-feature',
      title: 'Emergency SOS Feature',
      content: `
        The SOS button sends your exact location to emergency services and administrators. Use this only in real emergencies. When activated:
        
        1. Your location is immediately shared
        2. Admins are notified instantly
        3. Help will be dispatched to your coordinates
        4. Stay in your location if safe to do so
      `
    },
    {
      id: 'alerts',
      title: 'Understanding Weather Alerts',
      content: `
        • Green: Normal conditions
        • Yellow: Be aware of changing conditions
        • Orange: Potentially dangerous conditions
        • Red: Dangerous conditions - take action
        • Purple: Extremely dangerous conditions
        
        Always follow official warnings and evacuation orders.
      `
    }
  ]

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <HelpCircle className="h-5 w-5 text-blue-500" />
        Help & Guide
      </h3>

      <div className="space-y-3">
        {faqSections.map((section) => (
          <div key={section.id} className="border border-gray-200 rounded-lg">
            <button
              onClick={() => setOpenSection(openSection === section.id ? null : section.id)}
              className="w-full flex justify-between items-center p-4 text-left hover:bg-gray-50 rounded-lg"
            >
              <span className="font-medium text-gray-900">{section.title}</span>
              {openSection === section.id ? (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              )}
            </button>
            
            {openSection === section.id && (
              <div className="p-4 border-t border-gray-200">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                  {section.content}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick Tips */}
      <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <h4 className="font-bold text-yellow-800 mb-2">Quick Safety Tips</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• Check weather before outdoor activities</li>
          <li>• Have an emergency plan for severe weather</li>
          <li>• Keep emergency contacts handy</li>
          <li>• Know your evacuation routes</li>
          <li>• Stay informed during weather warnings</li>
        </ul>
      </div>
    </div>
  )
}

export default HelpAssistant