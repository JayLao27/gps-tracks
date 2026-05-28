import { useState, useCallback, useEffect } from 'react';
import { type IntelligenceReport } from '@/services/locationIntelligence';
import { type CoachPersona } from '@/hooks/useIntelligenceReport';

export interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
    timestamp: string;
}

const getWelcomeMessage = (persona: CoachPersona): string => {
    switch (persona) {
        case 'tough':
            return "I'm your Tough Coach. No excuses here. Let's look at your location data and see where you're slacking. What do you want to fix?";
        case 'encouraging':
            return "Hello! I'm your AI Coach. I'm so excited to help you optimize your spatial habits! How can I support your routine today?";
        case 'data-driven':
            return "AI Coach initialized. Mode: Data-driven. Ready to analyze your spatial tracking indices, productivity score, and goals. What metrics would you like to review?";
        case 'direct':
            return "I'm your coach. Let's optimize your routine. What do you need to look at?";
        default:
            return "Hello! How can I help you with your habits today?";
    }
};

export function useIntelligenceChat(
    report: IntelligenceReport,
    apiKey: string,
    persona: CoachPersona
) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Initialize/Reset welcome message when persona changes or chat is cleared
    const initializeChat = useCallback(() => {
        const welcomeText = getWelcomeMessage(persona);
        setMessages([
            {
                id: 'welcome',
                role: 'model',
                text: welcomeText,
                timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            },
        ]);
    }, [persona]);

    useEffect(() => {
        initializeChat();
    }, [initializeChat]);

    // Rule-based fallback responses when Gemini API Key is not set
    const getMockResponse = useCallback((userText: string): string => {
        const query = userText.toLowerCase();
        const score = report.productivity.score;
        const productive = report.productivity.productivePercent;
        const nonProductive = report.productivity.nonProductivePercent;
        const window = report.productivity.bestWindow;
        
        let reply = "";
        
        if (query.includes('score') || query.includes('productivity') || query.includes('percent')) {
            if (persona === 'tough') {
                reply = `Your productivity score is a mediocre ${score}/100. You spent ${nonProductive}% of your time wasting it in non-productive places. Get out of those zones and stick to your study hubs!`;
            } else if (persona === 'encouraging') {
                reply = `Your productivity score is at ${score}/100! That's a wonderful foundation. You spent ${productive}% of your time in productive zones. Your best focus window is ${window}—try scheduled blocks then!`;
            } else if (persona === 'data-driven') {
                reply = `Productivity Index: ${score}/100. Analysis shows ${productive}% productive vs ${nonProductive}% non-productive location duration. Core spatial focus density centers in the ${window} window.`;
            } else {
                reply = `Productivity is ${score}/100. Productive places: ${productive}%. Non-productive: ${nonProductive}%. Best window: ${window}. Focus on increasing productive time.`;
            }
        } 
        else if (query.includes('anomaly') || query.includes('anomalies') || query.includes('unusual') || query.includes('night')) {
            const hasAnomalies = report.anomalies.length > 0;
            if (hasAnomalies) {
                const msg = report.anomalies[0].message;
                if (persona === 'tough') {
                    reply = `Yes, we caught an anomaly: "${msg}". Late nights or unscheduled long stays will ruin your momentum. Lock down your schedule.`;
                } else if (persona === 'encouraging') {
                    reply = `We noticed one small routine deviation: "${msg}". Don't worry, routine shifts happen! Just try to guide yourself back to a steady rhythm tomorrow.`;
                } else if (persona === 'data-driven') {
                    reply = `Anomaly detected: "${msg}". Confidence score variance observed. Recommend aligning sleep/wake cycles to stabilize prediction models.`;
                } else {
                    reply = `Detected anomaly: "${msg}". Adjust your schedule to avoid late visits or unusual stays.`;
                }
            } else {
                if (persona === 'tough') {
                    reply = "No anomalies tracked. At least you're consistent. Keep it that way.";
                } else if (persona === 'encouraging') {
                    reply = "No anomalies detected! You've done an amazing job keeping your routine stable and predictable. Keep up the great work!";
                } else if (persona === 'data-driven') {
                    reply = "Anomalous events count: 0. Spatial trajectory matches baseline models within nominal tolerance bounds.";
                } else {
                    reply = "No anomalies detected. Routine is currently stable.";
                }
            }
        } 
        else if (query.includes('goal') || query.includes('gym') || query.includes('study') || query.includes('social')) {
            const goalsSummary = report.goalStatuses.map(g => {
                const pct = Math.min(100, Math.round((g.actualMinutes / g.goal.targetMinutes) * 100));
                return `${g.goal.title} (${pct}% achieved)`;
            }).join(', ');

            if (persona === 'tough') {
                reply = `Here is your goal status: ${goalsSummary}. You need to stop making excuses and put in the hours where you are lagging!`;
            } else if (persona === 'encouraging') {
                reply = `Look at your goal progress: ${goalsSummary}! You're making beautiful progress. Celebrate these steps and keep moving forward!`;
            } else if (persona === 'data-driven') {
                reply = `Goal completion vector: ${goalsSummary}. Productive minute allocations indicate localized targets are in active progression.`;
            } else {
                reply = `Goal status: ${goalsSummary}. Focus on completing the remaining minutes for daily targets.`;
            }
        }
        else if (query.includes('predict') || query.includes('prediction') || query.includes('next') || query.includes('where')) {
            const loc = report.prediction.nextLikelyLocation;
            const conf = report.prediction.confidence;
            const sched = report.prediction.schedulePrediction;

            if (persona === 'tough') {
                reply = `My predictor estimates you will go to ${loc} next with ${conf}% confidence. ${sched} Make sure you actually use that time productively.`;
            } else if (persona === 'encouraging') {
                reply = `I predict you will likely head to ${loc} next (confidence: ${conf}%)! ${sched} Have a wonderful, focused time there!`;
            } else if (persona === 'data-driven') {
                reply = `Routine Prediction: ${loc} designated as next node with confidence metric P=${conf}%. schedulePrediction state: ${sched}`;
            } else {
                reply = `Next predicted location: ${loc} (${conf}% confidence). Details: ${sched}`;
            }
        }
        else {
            // General responses based on persona
            if (persona === 'tough') {
                reply = "Stop wasting time with small talk. Ask me about your study goals, your anomalies, or why your productivity score isn't 100.";
            } else if (persona === 'encouraging') {
                reply = "I'm always here to listen and help! We can look at your productivity score, your goals, or plan your next location visits. What sounds good?";
            } else if (persona === 'data-driven') {
                reply = "Awaiting query parameters. Available telemetry datasets: [productivityScore], [routinePrediction], [goalStatuses], [anomaliesList].";
            } else {
                reply = "Let's review your spatial tracking. You can ask about your productivity, next locations, or active goals.";
            }
        }
        
        return reply;
    }, [report, persona]);

    // Send user message and fetch response
    const sendMessage = useCallback(async (text: string) => {
        if (!text.trim()) return;

        const timestampStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const userMsg: ChatMessage = {
            id: `msg-${Date.now()}-user`,
            role: 'user',
            text: text.trim(),
            timestamp: timestampStr,
        };

        setMessages((prev) => [...prev, userMsg]);
        setIsLoading(true);

        // Check if API key is provided
        const activeKey = apiKey || process.env.EXPO_PUBLIC_GEMINI_API_KEY || 'AIzaSyCr49Xp8Lj_XxQ--SQoPscXQVFgAyqOklg';

        if (!activeKey) {
            // Fallback to high-fidelity mock responses after a short realistic typing delay
            setTimeout(() => {
                const responseText = getMockResponse(text);
                const coachMsg: ChatMessage = {
                    id: `msg-${Date.now()}-coach`,
                    role: 'model',
                    text: responseText,
                    timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                };
                setMessages((prev) => [...prev, coachMsg]);
                setIsLoading(false);
            }, 1000);
            return;
        }

        // Prepare prompt and API parameters
        let personaInstructions = "Write in an encouraging, insightful, and professional tone.";
        let coachName = "Gemini AI Coach";

        if (persona === 'tough') {
            personaInstructions = "Write in a 'tough love', strict, challenging, and direct tone. Challenge the user, call out laziness, and avoid pleasantries or fluff. Push them to stay disciplined.";
            coachName = "Tough Coach";
        } else if (persona === 'encouraging') {
            personaInstructions = "Write in a highly warm, supportive, and positive tone. Celebrate small achievements, offer positive reinforcement, and guide them through setbacks gently.";
            coachName = "Encouraging Coach";
        } else if (persona === 'data-driven') {
            personaInstructions = "Write in an analytical, metric-focused, data-scientist style. Reference specific percentages, times, and statistics. Speak in objective mathematical correlations.";
            coachName = "Data Coach";
        } else if (persona === 'direct') {
            personaInstructions = "Write in an extremely concise, bullet-point, practical, and action-oriented tone. Get straight to the point. No fluff or extra comments.";
            coachName = "Direct Coach";
        }

        const stats = {
            productivityScore: report.productivity.score,
            productivePercent: report.productivity.productivePercent,
            nonProductivePercent: report.productivity.nonProductivePercent,
            bestWindow: report.productivity.bestWindow,
            nextLikelyLocation: report.prediction.nextLikelyLocation,
            predictionConfidence: report.prediction.confidence,
            anomalies: report.anomalies.map(a => a.message),
            patterns: report.patterns.map(p => p.message),
            goals: report.goalStatuses.map(g => ({
                title: g.goal.title,
                actualMinutes: g.actualMinutes,
                targetMinutes: g.goal.targetMinutes,
                achieved: g.achieved,
            })),
        };

        const systemPrompt = `You are a world-class AI Behavioral Coach named ${coachName}. ${personaInstructions}
You have access to the user's real-time location metrics:
${JSON.stringify(stats, null, 2)}

Instructions:
1. Answer the user's questions about their spatial habits, routines, productivity, and goals.
2. Ground your answers in their data above. Make references to their score, goals, or anomalies when relevant.
3. Keep responses relatively short (under 4-5 sentences, or brief bullet points).
4. Be conversational but fit your selected persona tone.
5. NEVER hallucinate places or metrics they haven't logged.`;

        try {
            // Build the contents history for Gemini multi-turn conversation
            // Filter out the welcome message because it doesn't match standard user-model-user sequence
            const apiHistory = messages
                .filter((m) => m.id !== 'welcome')
                .map((m) => ({
                    role: m.role,
                    parts: [{ text: m.text }],
                }));

            // Append the new user message
            apiHistory.push({
                role: 'user',
                parts: [{ text: text.trim() }],
            });

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${activeKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: apiHistory,
                        systemInstruction: {
                            parts: [{ text: systemPrompt }],
                        },
                    }),
                }
            );

            if (!response.ok) {
                throw new Error(`API returned status ${response.status}`);
            }

            const data = await response.json();
            const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!textResponse) {
                throw new Error('Empty response from Gemini API');
            }

            const coachMsg: ChatMessage = {
                id: `msg-${Date.now()}-coach`,
                role: 'model',
                text: textResponse.trim(),
                timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            };
            setMessages((prev) => [...prev, coachMsg]);

        } catch (e) {
            console.error('Error talking to Gemini chat API:', e);
            // Fallback to mock response if Gemini fails
            const fallbackText = getMockResponse(text);
            const coachMsg: ChatMessage = {
                id: `msg-${Date.now()}-coach`,
                role: 'model',
                text: `${fallbackText} (Note: Using local fallback. Ensure a valid Gemini API key is configured by tapping the key icon in the Coach card and verify your internet connection.)`,
                timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            };
            setMessages((prev) => [...prev, coachMsg]);
        } finally {
            setIsLoading(false);
        }
    }, [apiKey, report, persona, messages, getMockResponse]);

    const clearChat = useCallback(() => {
        initializeChat();
    }, [initializeChat]);

    return {
        messages,
        sendMessage,
        clearChat,
        isLoading,
    };
}
