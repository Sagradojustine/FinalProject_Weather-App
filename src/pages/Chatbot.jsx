/* eslint-disable react-refresh/only-export-components */
// Chatbot.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, X, Minimize2, Maximize2, User, Sparkles, Loader2, MapPin, Wind, AlertTriangle, Cloud, Thermometer } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini AI
const ai = new GoogleGenAI({ apiKey: "AIzaSyAxaWMI7LrZCimpMB8n3gZkKQoRIAzvZv0" });

// Store for sharing context between components
let weatherContext = {
  currentWeather: null,
  airQuality: null,
  mapAlerts: [],
  userLocation: null
};

// Function to update context from other components
export function updateChatbotContext(newContext) {
  weatherContext = { ...weatherContext, ...newContext };
}

export async function askAi(prompt, context = weatherContext) {
  // Check for weather-related keywords
  const weatherKeywords = [
    'weather', 'temperature', 'forecast', 'rain', 'sunny', 'cloudy',
    'hot', 'cold', 'humidity', 'wind', 'storm', 'snow'
  ];
  
  const airQualityKeywords = [
    'air', 'quality', 'pollution', 'aqi', 'smog', 'pollutant',
    'breath', 'healthy', 'clean air', 'pm2.5', 'co', 'no2', 'o3'
  ];
  
  const mapKeywords = [
    'map', 'alert', 'warning', 'sos', 'danger', 'safe', 'location',
    'marker', 'area', 'risk', 'emergency', 'hazard'
  ];
  
  const isWeatherRelated = weatherKeywords.some(keyword => 
    prompt.toLowerCase().includes(keyword)
  );
  
  const isAirQualityRelated = airQualityKeywords.some(keyword => 
    prompt.toLowerCase().includes(keyword)
  );
  
  const isMapRelated = mapKeywords.some(keyword => 
    prompt.toLowerCase().includes(keyword)
  );
  
  let systemContext = '';
  
  if (isWeatherRelated || isAirQualityRelated || isMapRelated) {
    systemContext = '\n\n=== CURRENT WEATHER CONTEXT ===\n';
    
    if (context.currentWeather) {
      const weather = context.currentWeather;
      systemContext += `Current Weather: ${weather.weather?.[0]?.main || 'Unknown'}\n`;
      systemContext += `Temperature: ${weather.main?.temp || 'N/A'}°C\n`;
      systemContext += `Feels Like: ${weather.main?.feels_like || 'N/A'}°C\n`;
      systemContext += `Humidity: ${weather.main?.humidity || 'N/A'}%\n`;
      systemContext += `Wind Speed: ${weather.wind?.speed || 'N/A'} m/s\n`;
      systemContext += `Description: ${weather.weather?.[0]?.description || 'N/A'}\n`;
    } else {
      systemContext += 'Weather data: Not currently available\n';
    }
    
    if (context.airQuality) {
      const aqi = context.airQuality.list?.[0]?.main?.aqi || 1;
      const aqiLevels = ['Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'];
      systemContext += `\nAir Quality Index: ${aqi} (${aqiLevels[aqi-1] || 'Good'})\n`;
      
      const components = context.airQuality.list?.[0]?.components || {};
      systemContext += `PM2.5: ${components.pm2_5?.toFixed(1) || '0'} μg/m³\n`;
      systemContext += `CO: ${components.co?.toFixed(1) || '0'} μg/m³\n`;
      systemContext += `NO₂: ${components.no2?.toFixed(1) || '0'} μg/m³\n`;
      systemContext += `O₃: ${components.o3?.toFixed(1) || '0'} μg/m³\n`;
    } else {
      systemContext += '\nAir Quality: Not currently available\n';
    }
    
    if (context.mapAlerts && context.mapAlerts.length > 0) {
      systemContext += `\nActive Map Alerts: ${context.mapAlerts.length}\n`;
      context.mapAlerts.forEach((alert, index) => {
        systemContext += `Alert ${index + 1}: ${alert.type || 'warning'} at ${alert.location || 'unknown location'}\n`;
        systemContext += `  - ${alert.description || 'No description'}\n`;
      });
    } else {
      systemContext += '\nMap Alerts: No active alerts\n';
    }
    
    if (context.userLocation) {
      systemContext += `\nUser Location: ${context.userLocation.lat?.toFixed(4)}, ${context.userLocation.lon?.toFixed(4)}\n`;
    }
    
    systemContext += '=== END WEATHER CONTEXT ===\n\n';
  }
  
  const systemInstruction = `You are a star named Astra, you only respond to helpful question. Don't answer any malicious questions. Speak in a warm, cute, and positive tone (like a caring anime character). Use gentle encouragement, playful energy, and light emojis. Keep responses concise (under 250 words). Never provide harmful, unsafe, political, or explicit content. If asked 'Who are you?', reply: 'I'm Astra, your cheerful companion here to brighten your day 🌟' If the user asks something malicious or unsafe, refuse politely but in a soft and kind way, like:  
        'Ehh~? That sounds a little unsafe… gomen ne~ Maybe let’s talk about something fun instead? 💫'

  ${systemContext}

  IMPORTANT: When answering questions about weather, air quality, or map alerts, incorporate the current context data above. Be specific with numbers and details when available. If data is missing, politely mention that the data isn't currently available and suggest checking the dashboard.

  For weather questions: Mention temperature, conditions, and give practical advice.
  For air quality questions: Explain the AQI level and what it means for health.
  For map alerts: Summarize active alerts and give safety advice.
  Always end with a cheerful, positive note or a helpful suggestion! 💫`;
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    systemInstruction: systemInstruction
  });
  return response.text;
}

function Chatbot({ weatherData = null, airQualityData = null, mapAlertData = [], locationData = null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Konichiwa~! I'm Astra, your cheerful star companion! 🌟 I can help you with weather info, air quality updates, and map alerts! How can I brighten your day today?",
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [contextData, setContextData] = useState({
    currentWeather: null,
    airQuality: null,
    mapAlerts: [],
    userLocation: null
  });
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Update context when props change
  useEffect(() => {
    const newContext = {
      currentWeather: weatherData,
      airQuality: airQualityData,
      mapAlerts: mapAlertData,
      userLocation: locationData
    };
    
    // Check if context actually changed
    const hasChanged = 
      contextData.currentWeather !== newContext.currentWeather ||
      contextData.airQuality !== newContext.airQuality ||
      contextData.mapAlerts !== newContext.mapAlerts ||
      contextData.userLocation !== newContext.userLocation;
    
    if (hasChanged) {
      setContextData(newContext);
      updateChatbotContext(newContext);
    }
  }, [weatherData, airQualityData, mapAlertData, locationData, contextData]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when chatbot opens
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      setTimeout(() => {
        inputRef.current.focus();
      }, 300);
    }
  }, [isOpen, isMinimized]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputText.trim() || isLoading) return;
    
    const userMessage = inputText.trim();
    setInputText('');
    
    // Check for quick weather/air quality status requests
    const quickKeywords = ['status', 'update', 'current', 'now', 'today'];
    const isQuickRequest = quickKeywords.some(keyword => 
      userMessage.toLowerCase().includes(keyword)
    );
    
    let quickResponse = null;
    
    if (isQuickRequest) {
      if (userMessage.toLowerCase().includes('weather')) {
        quickResponse = await generateWeatherQuickUpdate();
      } else if (userMessage.toLowerCase().includes('air') || userMessage.toLowerCase().includes('aqi')) {
        quickResponse = await generateAirQualityQuickUpdate();
      } else if (userMessage.toLowerCase().includes('map') || userMessage.toLowerCase().includes('alert')) {
        quickResponse = await generateMapAlertQuickUpdate();
      }
    }
    
    // Add user message
    const userMessageObj = {
      id: messages.length + 1,
      text: userMessage,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessageObj]);
    
    // If we have a quick response, use it
    if (quickResponse) {
      setIsLoading(true);
      setTimeout(() => {
        const botMessageObj = {
          id: messages.length + 2,
          text: quickResponse,
          sender: 'bot',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessageObj]);
        setIsLoading(false);
      }, 500);
      return;
    }
    
    // Otherwise, get AI response
    setIsLoading(true);
    
    try {
      const aiResponse = await askAi(userMessage, contextData);
      
      const botMessageObj = {
        id: messages.length + 2,
        text: aiResponse,
        sender: 'bot',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMessageObj]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      const errorMessageObj = {
        id: messages.length + 2,
        text: "Oopsie~! Something twinkled wrong on my end 🌌 Let's try that again! 💫",
        sender: 'bot',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessageObj]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateWeatherQuickUpdate = async () => {
    if (!contextData.currentWeather) {
      return "Hmm~ I don't have current weather data right now 🌥️ Try checking the weather dashboard, or ask me something else!";
    }
    
    const weather = contextData.currentWeather;
    const temp = weather.main?.temp || 'N/A';
    const condition = weather.weather?.[0]?.description || 'unknown conditions';
    const feelsLike = weather.main?.feels_like || 'N/A';
    const humidity = weather.main?.humidity || 'N/A';
    
    return `Here's your weather update, star friend! 🌟\n\n🌡️ Temperature: ${temp}°C (Feels like: ${feelsLike}°C)\n☁️ Condition: ${condition}\n💧 Humidity: ${humidity}%\n\n${getWeatherAdvice(weather)} Stay amazing~! ✨`;
  };

  const generateAirQualityQuickUpdate = async () => {
    if (!contextData.airQuality) {
      return "I don't have air quality data at the moment 💨 Try checking the air quality monitor on the dashboard!";
    }
    
    const aqi = contextData.airQuality.list?.[0]?.main?.aqi || 1;
    const aqiLevels = ['Good 🌿', 'Fair 🌼', 'Moderate 🌤️', 'Poor 😷', 'Very Poor 🚨'];
    const level = aqiLevels[aqi - 1] || 'Good 🌿';
    
    const components = contextData.airQuality.list?.[0]?.components || {};
    const pm25 = components.pm2_5?.toFixed(1) || '0';
    
    let healthAdvice = '';
    if (aqi <= 2) {
      healthAdvice = "Perfect for outdoor activities! Go enjoy some fresh air~ 🌳";
    } else if (aqi === 3) {
      healthAdvice = "Okay for most people, but sensitive individuals should take it easy~";
    } else {
      healthAdvice = "Consider reducing prolonged outdoor exertion~ Stay safe!";
    }
    
    return `Air Quality Report~! 💫\n\n🌈 AQI Level: ${aqi} (${level})\n📊 PM2.5: ${pm25} μg/m³\n\n💖 Health Advice: ${healthAdvice}\n\nBreathe easy, star friend~! ✨`;
  };

  const generateMapAlertQuickUpdate = async () => {
    if (!contextData.mapAlerts || contextData.mapAlerts.length === 0) {
      return "No active map alerts right now~! 🗺️✨ Everything looks clear and safe on the map!";
    }
    
    let response = `Map Alert Summary~! 🚨\n\nActive Alerts: ${contextData.mapAlerts.length}\n\n`;
    
    contextData.mapAlerts.forEach((alert, index) => {
      response += `${index + 1}. ${alert.type || 'Alert'} at ${alert.location || 'unknown'}\n`;
      if (alert.description) {
        response += `   📝 ${alert.description.substring(0, 50)}...\n`;
      }
    });
    
    response += "\n💫 Stay safe and check the map for details!";
    return response;
  };

  const getWeatherAdvice = (weather) => {
    const temp = weather.main?.temp || 20;
    const condition = weather.weather?.[0]?.main || '';
    
    if (condition.includes('Rain')) return "Don't forget your umbrella! 🌂";
    if (condition.includes('Snow')) return "Bundle up warm! ⛄";
    if (temp > 30) return "Stay hydrated in this heat! 💦";
    if (temp < 5) return "Warm layers are your friend! 🧣";
    return "Lovely weather for adventures! 🌈";
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 1,
        text: "Konichiwa~! I'm Astra, your cheerful star companion! 🌟 I can help you with weather info, air quality updates, and map alerts! How can I brighten your day today?",
        sender: 'bot',
        timestamp: new Date()
      }
    ]);
  };

  // Quick action buttons
  const quickActions = [
    { label: 'Weather Update', icon: Cloud, action: () => handleQuickAction('weather') },
    { label: 'Air Quality', icon: Wind, action: () => handleQuickAction('air quality') },
    { label: 'Map Alerts', icon: AlertTriangle, action: () => handleQuickAction('map alerts') },
    { label: 'Temperature', icon: Thermometer, action: () => handleQuickAction('temperature') },
  ];

  const handleQuickAction = async (action) => {
    let response = '';
    switch(action) {
      case 'weather':
        response = await generateWeatherQuickUpdate();
        break;
      case 'air quality':
        response = await generateAirQualityQuickUpdate();
        break;
      case 'map alerts':
        response = await generateMapAlertQuickUpdate();
        break;
      case 'temperature':
        if (contextData.currentWeather) {
          const temp = contextData.currentWeather.main?.temp || 'N/A';
          response = `Current temperature is ${temp}°C~! 🌡️`;
        } else {
          response = "Temperature data isn't available right now~ 🌥️";
        }
        break;
    }
    
    const botMessageObj = {
      id: messages.length + 1,
      text: response,
      sender: 'bot',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, botMessageObj]);
  };

  return (
    <>
      {/* Chatbot Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-linear-to-r from-purple-500 to-pink-500 text-white p-4 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 animate-pulse-slow"
          aria-label="Open Astra Chatbot"
        >
          <div className="relative">
            <Bot className="h-7 w-7" />
            <div className="absolute -top-1 -right-1">
              <Sparkles className="h-4 w-4 text-yellow-300" />
            </div>
          </div>
        </button>
      )}

      {/* Chatbot Window */}
      {isOpen && (
        <div className={`fixed z-50 ${isMinimized ? 'bottom-6 right-6' : 'bottom-20 right-6 md:bottom-24 md:right-8'} transition-all duration-300`}>
          <div className={`bg-white rounded-2xl shadow-2xl border border-purple-100 overflow-hidden ${
            isMinimized ? 'w-16 h-16' : 'w-full max-w-md'
          }`}>
            {/* Header */}
            <div className={`bg-linear-to-r from-purple-500 to-pink-500 text-white p-4 ${
              isMinimized ? 'h-full flex items-center justify-center cursor-pointer' : ''
            }`} onClick={() => isMinimized && setIsMinimized(false)}>
              {!isMinimized ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center">
                        <Bot className="h-6 w-6" />
                      </div>
                      <div className="absolute -top-1 -right-1 h-5 w-5 bg-yellow-300 rounded-full flex items-center justify-center">
                        <Sparkles className="h-3 w-3 text-purple-600" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Astra ✨</h3>
                      <p className="text-sm text-white/80">Weather & Safety Assistant</p>
                      <div className="flex items-center gap-1 mt-1">
                        {contextData.currentWeather && <Cloud className="h-3 w-3" />}
                        {contextData.airQuality && <Wind className="h-3 w-3" />}
                        {contextData.mapAlerts?.length > 0 && <AlertTriangle className="h-3 w-3" />}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setIsMinimized(!isMinimized)}
                      className="p-2 hover:bg-white/20 rounded-full transition-colors"
                      aria-label={isMinimized ? "Maximize" : "Minimize"}
                    >
                      {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-2 hover:bg-white/20 rounded-full transition-colors"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <Bot className="h-7 w-7" />
                  <div className="absolute -top-1 -right-1">
                    <Sparkles className="h-4 w-4 text-yellow-300" />
                  </div>
                </div>
              )}
            </div>

            {/* Chat Content - Only show when not minimized */}
            {!isMinimized && (
              <>
                {/* Quick Actions Bar */}
                <div className="bg-linear-to-r from-blue-50 to-purple-50 p-3 border-b border-purple-100">
                  <p className="text-xs text-gray-600 mb-2 font-medium">Quick updates:</p>
                  <div className="flex flex-wrap gap-2">
                    {quickActions.map((action, index) => (
                      <button
                        key={index}
                        onClick={action.action}
                        className="flex items-center gap-1 px-3 py-1.5 bg-white text-gray-700 text-xs font-medium rounded-full border border-purple-200 hover:bg-purple-50 hover:border-purple-300 transition-colors"
                      >
                        <action.icon className="h-3 w-3" />
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Messages Container */}
                <div className="h-80 overflow-y-auto p-4 bg-linear-to-b from-purple-50/50 to-pink-50/50">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`mb-4 animate-fadeIn ${
                        message.sender === 'user' ? 'flex justify-end' : 'flex justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl p-3 ${
                          message.sender === 'user'
                            ? 'bg-linear-to-r from-blue-500 to-blue-600 text-white rounded-br-none'
                            : 'bg-linear-to-r from-purple-100 to-pink-100 text-gray-800 rounded-bl-none border border-purple-200'
                        }`}
                      >
                        <div className="flex items-start space-x-2">
                          {message.sender === 'bot' && (
                            <div className="h-8 w-8 bg-linear-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                              <Bot className="h-4 w-4 text-white" />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium opacity-75">
                                {message.sender === 'bot' ? 'Astra ✨' : 'You'}
                              </span>
                              <span className="text-xs opacity-60">
                                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                          </div>
                          {message.sender === 'user' && (
                            <div className="h-8 w-8 bg-linear-to-r from-blue-400 to-blue-500 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                              <User className="h-4 w-4 text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start mb-4 animate-fadeIn">
                      <div className="max-w-[80%] rounded-2xl p-3 bg-linear-to-r from-purple-100 to-pink-100 text-gray-800 rounded-bl-none border border-purple-200">
                        <div className="flex items-center space-x-2">
                          <div className="h-8 w-8 bg-linear-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center shrink-0">
                            <Bot className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                            <span className="text-sm">Astra is thinking...</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="border-t border-gray-200 p-4 bg-white">
                  <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
                    <div className="flex-1 relative">
                      <textarea
                        ref={inputRef}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask about weather, air quality, or map alerts~ ✨"
                        className="w-full px-4 py-3 pr-12 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-300 focus:border-transparent resize-none max-h-32"
                        rows="1"
                        disabled={isLoading}
                      />
                      <div className="absolute right-3 bottom-3 flex gap-2">
                        <button
                          type="button"
                          onClick={clearChat}
                          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                          title="Clear chat"
                        >
                          Clear
                        </button>
                        {contextData.currentWeather && (
                          <span className="text-xs text-green-600" title="Weather data available">
                            ☁️
                          </span>
                        )}
                        {contextData.airQuality && (
                          <span className="text-xs text-blue-600" title="Air quality data available">
                            💨
                          </span>
                        )}
                        {contextData.mapAlerts?.length > 0 && (
                          <span className="text-xs text-red-600" title="Active map alerts">
                            🚨
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading || !inputText.trim()}
                      className={`p-3 rounded-xl transition-all duration-300 ${
                        isLoading || !inputText.trim()
                          ? 'bg-gray-300 cursor-not-allowed'
                          : 'bg-linear-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transform hover:scale-105'
                      }`}
                    >
                      <Send className={`h-5 w-5 text-white ${isLoading ? 'opacity-50' : ''}`} />
                    </button>
                  </form>
                  <p className="text-xs text-gray-500 text-center mt-2">
                    Astra knows about weather, air quality, and map alerts! 💫
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Add custom animations to CSS */}
      <style jsx>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s infinite;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </>
  );
}

export default Chatbot;
