import React, { useState, useEffect } from 'react'
import { Mic, MicOff, Volume2 } from 'lucide-react'

function VoiceWeatherAssistant({ weatherData }) {
  const [listening, setListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)

  useEffect(() => {
    setSpeechSupported(
      'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
    )
  }, [])

  const speakWeather = () => {
    if (!weatherData) return

    const speech = new SpeechSynthesisUtterance()
    const { main, weather, name } = weatherData
    
    speech.text = `
      Current weather in ${name}: 
      ${weather[0].description}. 
      Temperature is ${Math.round(main.temp)} degrees Celsius. 
      Humidity is ${main.humidity} percent. 
      Wind speed is ${Math.round(main.wind_speed)} meters per second.
    `
    
    speech.rate = 0.8
    speech.pitch = 1
    speech.volume = 1

    window.speechSynthesis.speak(speech)
  }

  const startListening = () => {
    if (!speechSupported) return

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onstart = () => setListening(true)
    recognition.onend = () => setListening(false)
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase()
      handleVoiceCommand(transcript)
    }

    recognition.start()
  }

  const handleVoiceCommand = (command) => {
    if (command.includes('weather') || command.includes('temperature')) {
      speakWeather()
    } else if (command.includes('humidity')) {
      const speech = new SpeechSynthesisUtterance()
      speech.text = `Humidity is ${weatherData.main.humidity} percent.`
      window.speechSynthesis.speak(speech)
    } else if (command.includes('wind')) {
      const speech = new SpeechSynthesisUtterance()
      speech.text = `Wind speed is ${Math.round(weatherData.wind.speed)} meters per second.`
      window.speechSynthesis.speak(speech)
    }
  }

  if (!speechSupported) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Voice Assistant</h3>
        <p className="text-gray-500 text-sm">
          Voice features not supported in your browser
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Voice Weather Assistant</h3>
      
      <div className="flex gap-3">
        <button
          onClick={speakWeather}
          className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-200"
        >
          <Volume2 className="h-5 w-5" />
          Speak Weather
        </button>
        
        <button
          onClick={startListening}
          disabled={listening}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition duration-200 ${
            listening 
              ? 'bg-red-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {listening ? (
            <MicOff className="h-5 w-5" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
          {listening ? 'Listening...' : 'Voice Command'}
        </button>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          Try saying: "What's the weather?", "Temperature", "Humidity", or "Wind speed"
        </p>
      </div>
    </div>
  )
}

export default VoiceWeatherAssistant