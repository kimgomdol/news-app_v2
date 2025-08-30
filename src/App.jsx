// App.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  ExternalLink,
  Newspaper,
  Star, // 북마크, 추천 아이콘
  ThumbsUp, // UP 투표 아이콘
  ThumbsDown, // DOWN 투표 아이콘
  MessageCircle, // 댓글 아이콘
  Bot, // AI 아이콘
  User, // 사용자 아이콘
  X, // 삭제 아이콘
  PlusCircle, // 추가 아이콘
  CheckSquare,
  Square
} from "lucide-react";

// Firebase Imports
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, query, where, onSnapshot, addDoc, deleteDoc, doc, getDocs, setDoc, updateDoc, getDoc } from 'firebase/firestore';

// --- Shadcn UI Placeholder Components ---
const Alert = ({ variant, children, className }) => (
  <div className={`p-4 rounded-lg my-4 ${variant === 'destructive' ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-blue-100 text-blue-700 border border-blue-300'} ${className}`}>
    {children}
  </div>
);

const AlertTitle = ({ children }) => <h5 className="font-bold text-lg mb-1">{children}</h5>;
const AlertDescription = ({ children }) => <p className="text-sm">{children}</p>;

const Card = ({ children, className }) => (
  <div className={`bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200 ${className}`}>
    {children}
  </div>
);

// --- Main App Component ---
const ITNewsApp = () => {
  // News & UI State
  const [newsData, setNewsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [latestDate, setLatestDate] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // Default to all
  const [showMoreCounts, setShowMoreCounts] = useState({});

  // Firebase State
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Feature State
  const [bookmarkedNewsIds, setBookmarkedNewsIds] = useState(new Set());
  const [aiInsights, setAiInsights] = useState({});
  const [loadingInsight, setLoadingInsight] = useState({});
  const [aiInsightMetrics, setAiInsightMetrics] = useState({});
  const [aiInsightComments, setAiInsightComments] = useState([]);
  const [isGeneratingAiReply, setIsGeneratingAiReply] = useState({});

  // Keywords State (for Management Tab)
  const [managementTabCategory, setManagementTabCategory] = useState('기업동향');
  const [managementKeywords, setManagementKeywords] = useState({
    '기업동향': [
        { name: '네이버', checked: true, recommended: false, newsCount: Math.floor(Math.random() * 50) + 5 },
        { name: '카카오', checked: true, recommended: false, newsCount: Math.floor(Math.random() * 50) + 5 },
        { name: '토스', checked: true, recommended: false, newsCount: Math.floor(Math.random() * 50) + 5 },
        { name: '당근마켓', checked: true, recommended: false, newsCount: Math.floor(Math.random() * 50) + 5 },
        { name: '컬리', checked: true, recommended: false, newsCount: Math.floor(Math.random() * 50) + 5 },
        { name: '배민', checked: true, recommended: false, newsCount: Math.floor(Math.random() * 50) + 5 },
        { name: '쿠팡이츠', checked: false, recommended: true, newsCount: Math.floor(Math.random() * 50) + 5 },
    ],
    'AD TECH': [
        { name: 'AI 광고', checked: true, recommended: false, newsCount: Math.floor(Math.random() * 50) + 5 },
        { name: 'AD TECH', checked: false, recommended: true, newsCount: Math.floor(Math.random() * 50) + 5 },
        { name: '네이버 광고', checked: true, recommended: false, newsCount: Math.floor(Math.random() * 50) + 5 },
        { name: '광고 플랫폼', checked: true, recommended: false, newsCount: Math.floor(Math.random() * 50) + 5 },
    ],
    '커머스': [
        { name: '라이브 커머스', checked: true, recommended: false, newsCount: Math.floor(Math.random() * 50) + 5 },
        { name: '이커머스 솔루션', checked: true, recommended: false, newsCount: Math.floor(Math.random() * 50) + 5 },
        { name: '풀필먼트', checked: false, recommended: true, newsCount: Math.floor(Math.random() * 50) + 5 },
    ]
  });

  // --- Configuration ---
  const SHEET_ID = "1UFE_q1cuaa4WrgATcO6MlvZOgq1zKkU_IAHrJzxPU7U";
  const SHEET_NAME = "news";
  const GOOGLE_SHEETS_API_KEY = "AIzaSyDIig_uUt8grXOehM3JyI_sabFBh3EuTS8";
  const GEMINI_API_KEY = "AIzaSyDIig_uUt8grXOehM3JyI_sabFBh3EuTS8";

  const commentInputRefs = useRef({});

  // --- Firebase Initialization & Auth ---
  useEffect(() => {
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'it-news-app-preview';
    let firebaseConfig;
    try {
        firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
    } catch(e) {
        console.error("Failed to parse Firebase config:", e);
        setError("앱 설정을 불러오는 데 실패했습니다.");
        setLoading(false);
        return;
    }

    try {
      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const authInstance = getAuth(app);

      setDb(firestore);
      setAuth(authInstance);

      const unsubscribeAuth = onAuthStateChanged(authInstance, async (user) => {
        if (user) {
          setUserId(user.uid);
        } else {
          try {
            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
              await signInWithCustomToken(authInstance, __initial_auth_token);
            } else {
              await signInAnonymously(authInstance);
            }
            setUserId(authInstance.currentUser?.uid);
          } catch (authError) {
            console.error("Authentication failed:", authError);
            setError("사용자 인증에 실패했습니다.");
            setUserId(crypto.randomUUID());
          }
        }
        setIsAuthReady(true);
      });

      return () => unsubscribeAuth();
    } catch (e) {
      console.error("Firebase initialization failed:", e);
      setError("앱 초기화 중 오류가 발생했습니다.");
      setLoading(false);
    }
  }, []);

  // --- Data Fetching ---
  useEffect(() => {
    if (activeTab === 'management') {
        setLoading(false);
        return;
    };

    const fetchNewsFromGoogleSheets = async () => {
      setLoading(true);
      setError("");

      if (!GOOGLE_SHEETS_API_KEY) {
        console.warn("Google Sheets API key is missing. Using simulated data.");
        loadSimulatedData();
        return;
      }

      try {
        const encodedSheetName = encodeURIComponent(SHEET_NAME);
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodedSheetName}?key=${GOOGLE_SHEETS_API_KEY}`;
        const response = await fetch(url);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Google Sheets API Error: ${errorData.error.message}`);
        }

        const data = await response.json();
        const rows = data.values;

        if (!rows || rows.length <= 1) {
          throw new Error("No data found in Google Sheets.");
        }

        const dataRows = rows.slice(1);
        const parsedNews = dataRows.map((row, index) => ({
          id: row[8] || `news-${index}`,
          title: row[0] || "",
          keyword: row[1] || "",
          source: row[2] || "",
          tags: row[3] || "",
          url: row[4] || "",
          date: row[5] || "",
          summary: row[6] || "",
          likes: parseInt(row[7]) || 0,
        })).filter(news => news.title && news.url);

        setNewsData(parsedNews);
        if (parsedNews.length > 0) {
          const latest = parsedNews.sort((a, b) => new Date(b.date) - new Date(a.date))[0].date;
          setLatestDate(latest);
        }
      } catch (err) {
        console.error("Failed to fetch from Google Sheets:", err);
        setError(`뉴스 데이터를 불러오는 데 실패했습니다. 시뮬레이션 데이터로 대체합니다. (${err.message})`);
        loadSimulatedData();
      } finally {
        setLoading(false);
      }
    };

    const loadSimulatedData = () => {
      const simulatedData = [
         { id: "sim-0", title: "네이버, AI 검색 서비스 대폭 개선... 정확도 30% 향상", keyword: "네이버", source: "IT조선", tags: "#AI #검색 #기술혁신 #추천", url: "https://example.com/news1", date: "2025-08-01", summary: "네이버가 자체 개발한 AI 기술을 적용하여 검색 정확도를 크게 개선했으며, 사용자 만족도가 크게 향상될 것으로 예상됩니다.", likes: 12 },
         { id: "sim-1", title: "토스, 투자 플랫폼 '토스증권' 월 거래액 10조원 돌파", keyword: "토스", source: "매일경제", tags: "#핀테크 #투자 #거래액 #추천", url: "https://example.com/news2", date: "2025-07-31", summary: "토스증권이 월 거래액 10조원을 돌파하며 핀테크 시장의 새로운 강자로 떠올랐습니다.", likes: 8 },
         { id: "sim-2", title: "카카오, 새로운 소셜 서비스 '카카오뷰' 출시", keyword: "카카오", source: "전자신문", tags: "#소셜 #플랫폼 #신규서비스", url: "https://example.com/news3", date: "2025-07-31", summary: "카카오가 콘텐츠 큐레이션 기반의 새로운 소셜 서비스 '카카오뷰'를 출시하며 플랫폼 영향력 강화에 나섰습니다.", likes: 25 },
         { id: "sim-3", title: "당근마켓, 지역 커뮤니티 활성화로 월 사용자 2천만 명 달성", keyword: "당근마켓", source: "블로터", tags: "#커뮤니티 #중고거래 #추천", url: "https://example.com/news4", date: "2025-07-30", summary: "당근마켓이 단순 중고거래를 넘어 지역 커뮤니티 플랫폼으로 자리매김하며 월간 활성 사용자(MAU) 2천만 명을 돌파했습니다.", likes: 40 },
      ];
      setNewsData(simulatedData);
      if (simulatedData.length > 0) {
        const latest = simulatedData.sort((a, b) => new Date(b.date) - new Date(a.date))[0].date;
        setLatestDate(latest);
      }
      setLoading(false);
    };

    fetchNewsFromGoogleSheets();
  }, [activeTab]);

  // Firestore Listeners
  useEffect(() => {
    if (!isAuthReady || !db || !userId) return;
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'it-news-app-preview';

    const bookmarksCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/bookmarks`);
    const unsubscribeBookmarks = onSnapshot(query(bookmarksCollectionRef), (snapshot) => {
      const fetchedBookmarks = new Set(snapshot.docs.map(doc => doc.data().newsId));
      setBookmarkedNewsIds(fetchedBookmarks);
    }, (error) => console.error("Failed to load bookmarks:", error));

    const metricsCollectionRef = collection(db, `artifacts/${appId}/public/data/aiInsightMetrics`);
    const unsubscribeMetrics = onSnapshot(metricsCollectionRef, (snapshot) => {
      const fetched = {};
      snapshot.forEach(doc => { fetched[doc.id] = doc.data(); });
      setAiInsightMetrics(fetched);
    }, (error) => console.error("Failed to load AI insight metrics:", error));

    const commentsCollectionRef = collection(db, `artifacts/${appId}/public/data/aiInsightComments`);
    const unsubscribeComments = onSnapshot(query(commentsCollectionRef), (snapshot) => {
      const fetchedComments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAiInsightComments(fetchedComments);
    }, (error) => console.error("Failed to load AI insight comments:", error));

    return () => {
      unsubscribeBookmarks();
      unsubscribeMetrics();
      unsubscribeComments();
    };
  }, [db, userId, isAuthReady]);

  // --- Event Handlers & Logic ---
  const handleLoadMore = (date) => {
    setShowMoreCounts(p => ({ ...p, [date]: (p[date] || 3) + 3 }));
  };

  const toggleBookmark = async (newsId) => {
    if (!db || !userId) return;
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'it-news-app-preview';
    const bookmarksCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/bookmarks`);
    try {
      if (bookmarkedNewsIds.has(newsId)) {
        const q = query(bookmarksCollectionRef, where("newsId", "==", newsId));
        const snapshot = await getDocs(q);
        snapshot.forEach(d => deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/bookmarks`, d.id)));
      } else {
        await addDoc(bookmarksCollectionRef, { newsId, timestamp: new Date().toISOString() });
      }
    } catch (e) { console.error("Bookmark toggle failed: ", e); }
  };

  const callGeminiAPI = async (prompt) => {
    const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;
    
    for (let i = 0; i < 3; i++) {
        try {
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (response.ok) {
                const result = await response.json();
                if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
                    return result.candidates[0].content.parts[0].text;
                }
            } else if (response.status === 429) {
                console.warn(`Rate limited. Retrying in ${Math.pow(2, i)}s...`);
                await new Promise(res => setTimeout(res, 1000 * Math.pow(2, i)));
            } else {
                const errorText = await response.text();
                throw new Error(`API 오류: ${response.status} - ${errorText}`);
            }
        } catch (fetchError) {
             console.error(`Fetch attempt ${i + 1} failed:`, fetchError);
             if (i === 2) throw fetchError;
             await new Promise(res => setTimeout(res, 1000 * Math.pow(2, i)));
        }
    }
    throw new Error("AI 응답 생성 실패: 최대 재시도 횟수를 초과했습니다.");
  };

  const fetchAiInsight = async (newsId, newsTitle) => {
    setLoadingInsight(p => ({ ...p, [newsId]: true }));
    try {
      const prompt = `"${newsTitle}" 기사의 시사점을 IT 전문가 관점에서 3줄로 요약하여 제안해주세요.`;
      const insightText = await callGeminiAPI(prompt);
      setAiInsights(p => ({ ...p, [newsId]: insightText }));
    } catch (e) {
      setAiInsights(p => ({ ...p, [newsId]: `AI 인사이트 생성 실패: ${e.message}` }));
    } finally {
      setLoadingInsight(p => ({ ...p, [newsId]: false }));
    }
  };

  const handleAiInsightVote = async (newsId, voteType) => {
    if (!db || !userId) return;
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'it-news-app-preview';
    const metricDocRef = doc(db, `artifacts/${appId}/public/data/aiInsightMetrics`, String(newsId));
    try {
        const docSnap = await getDoc(metricDocRef);
        const currentData = docSnap.data() || { upvotes: 0, downvotes: 0 };
        const update = { 
            upvotes: currentData.upvotes + (voteType === 'up' ? 1 : 0), 
            downvotes: currentData.downvotes + (voteType === 'down' ? 1 : 0) 
        };
        await setDoc(metricDocRef, { newsId, ...update }, { merge: true });
    } catch (e) { console.error("AI insight vote update failed:", e); }
  };

  const handleAddAiInsightComment = async (newsId, newsTitle) => {
    const inputElement = commentInputRefs.current[newsId];
    if (!inputElement || !inputElement.value.trim() || !db || !userId) return;
    const commentText = inputElement.value;
    inputElement.value = '';

    const appId = typeof __app_id !== 'undefined' ? __app_id : 'it-news-app-preview';
    const commentsCollectionRef = collection(db, `artifacts/${appId}/public/data/aiInsightComments`);
    try {
      await addDoc(commentsCollectionRef, { newsId, text: commentText, timestamp: new Date().toISOString(), userId, role: "user" });
      setIsGeneratingAiReply(p => ({ ...p, [newsId]: true }));
      const prompt = `뉴스 제목: "${newsTitle}"\n인간 댓글: "${commentText}"\n\n이 댓글에 대해 AI로서 다음 형식에 맞춰 답변해줘:\n[AI의 생각] (댓글 분석 요약 1줄)\n[1줄 반박 논리]\n[근거1]\n[근거2]`;
      const aiReplyText = await callGeminiAPI(prompt);
      await addDoc(commentsCollectionRef, { newsId, text: aiReplyText, timestamp: new Date().toISOString(), userId: "AI", role: "ai" });
    } catch (e) {
      setError(`댓글 처리 중 오류 발생: ${e.message}`);
    } finally {
      setIsGeneratingAiReply(p => ({ ...p, [newsId]: false }));
    }
  };

  const handleKeywordCheckChange = (category, keywordName) => {
    setManagementKeywords(prev => {
        const updatedCategory = prev[category].map(kw => 
            kw.name === keywordName ? { ...kw, checked: !kw.checked } : kw
        );
        return { ...prev, [category]: updatedCategory };
    });
  };

  // --- Rendering Logic ---
  const filteredNewsData = newsData.filter(news => {
    if (activeTab === "recommended") return news.tags.includes("추천");
    if (activeTab === "bookmarks") return bookmarkedNewsIds.has(news.id);
    return true;
  });

  const groupedNewsByDate = filteredNewsData.reduce((groups, news) => {
    const date = news.date || "날짜 없음";
    if (!groups[date]) groups[date] = [];
    groups[date].push(news);
    return groups;
  }, {});
  const sortedDates = Object.keys(groupedNewsByDate).sort((a, b) => new Date(b) - new Date(a));

  const ManagementTabContent = () => (
    <div className="max-w-4xl mx-auto">
        <h2 className="text-xl text-gray-800 mb-4">나의 뉴스 키워드 관리</h2>
        <div className="mb-4 border-b border-gray-200">
            <div className="flex space-x-4">
                {Object.keys(managementKeywords).map(category => (
                    <button 
                        key={category}
                        onClick={() => setManagementTabCategory(category)}
                        className={`px-4 py-2 text-base font-medium rounded-t-lg ${
                            managementTabCategory === category 
                            ? 'bg-white border-gray-200 border-t border-l border-r text-blue-600' 
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {category}
                    </button>
                ))}
            </div>
        </div>
        
        <Card className="p-4 sm:p-6">
            <div className="space-y-2">
                {managementKeywords[managementTabCategory].map((keyword, index) => (
                    <div 
                        key={index} 
                        onClick={() => handleKeywordCheckChange(managementTabCategory, keyword.name)}
                        className="flex items-center p-4 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                        {keyword.checked ? <CheckSquare size={24} className="text-blue-600 mr-4 flex-shrink-0" /> : <Square size={24} className="text-gray-400 mr-4 flex-shrink-0" />}
                        <div className="flex-grow flex items-center">
                            {keyword.recommended && (
                                <span className="text-sm bg-green-100 text-green-800 font-bold rounded-full px-2.5 py-1 mr-2">추천</span>
                            )}
                            <span className="text-base text-gray-900 font-medium">{keyword.name}</span>
                        </div>
                        <span className="text-base text-gray-500 ml-4">({keyword.newsCount}개 관련 뉴스)</span>
                    </div>
                ))}
            </div>
        </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="sticky top-0 bg-white shadow-sm z-20">
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Newspaper className="text-blue-600 w-7 h-7" />
            <h1 className="text-2xl font-bold text-gray-900">키워드뉴스</h1>
          </div>
          {latestDate && activeTab !== 'management' && (
            <span className="text-gray-500 text-sm self-center">
              업데이트: {latestDate}
            </span>
          )}
        </div>
        <div className="flex justify-start border-b border-gray-200 bg-gray-50 px-4">
          {["all", "recommended", "bookmarks", "management"].map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); }}
              className={`py-3 px-5 text-base font-semibold transition-colors duration-200 ${
                activeTab === tab
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-blue-600 hover:bg-gray-100"
              }`}
            >
              {tab === 'recommended' ? '추천' : tab === 'all' ? '전체' : tab === 'bookmarks' ? '북마크' : '관리'}
            </button>
          ))}
        </div>
      </header>

      <main className="p-4 sm:p-6">
        {loading && <div className="text-center text-gray-500 p-8"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div><p>뉴스 데이터를 불러오는 중...</p></div>}
        {error && !loading && <Alert variant="destructive" className="mx-auto max-w-4xl"><AlertTitle>오류 발생</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
        
        {activeTab === 'management' && <ManagementTabContent />}

        {['recommended', 'all', 'bookmarks'].includes(activeTab) && !loading && (
            <>
                {sortedDates.length === 0 && !error && (
                    <div className="text-center text-gray-500 p-8 mt-8">
                        <MessageCircle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-xl font-semibold text-gray-700">표시할 뉴스가 없습니다.</h3>
                        <p className="text-gray-500 mt-2">{activeTab === 'bookmarks' ? '북마크한 뉴스가 여기에 표시됩니다.' : '다른 탭을 확인해보세요.'}</p>
                    </div>
                )}
                {sortedDates.map(date => (
                    <section key={date} className="max-w-4xl mx-auto mb-8">
                        <h2 className="text-lg font-bold text-gray-700 mb-3 pl-2 border-l-4 border-blue-500">{date}</h2>
                        <div className="space-y-4">
                            {groupedNewsByDate[date].slice(0, showMoreCounts[date] || 3).map((news) => (
                                <Card key={news.id} className="p-4 bg-white hover:shadow-md transition-shadow duration-200">
                                    <div className="flex justify-between items-start gap-4">
                                        <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-1 flex-grow">{news.title}</h3>
                                        <button onClick={() => toggleBookmark(news.id)} className="p-2 rounded-full hover:bg-yellow-100 transition-colors flex-shrink-0" aria-label="Toggle bookmark">
                                            <Star size={22} className={bookmarkedNewsIds.has(news.id) ? "text-yellow-500 fill-current" : "text-gray-400 hover:text-yellow-500"} />
                                        </button>
                                    </div>
                                    <p className="text-gray-700 text-base leading-relaxed my-3">{news.summary}</p>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600 mb-4">
                                        <span className="bg-gray-100 px-2 py-1 rounded-md font-medium">{news.keyword}</span>
                                        <span>{news.source}</span>
                                        {news.url && <a href={news.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline font-medium"><ExternalLink size={14} />원문 보기</a>}
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-gray-200">
                                        {!aiInsights[news.id] && (
                                            <div className="flex justify-between items-center">
                                                {activeTab === 'recommended' ? (
                                                    <div className="flex items-center">
                                                        <div className="flex -space-x-2 mr-2">
                                                            <img className="inline-block h-6 w-6 rounded-full ring-2 ring-white" src="https://placehold.co/32x32/2DB400/FFFFFF?text=N" alt="Naver logo" />
                                                            <img className="inline-block h-6 w-6 rounded-full ring-2 ring-white" src="https://placehold.co/32x32/F9E000/FFFFFF?text=K" alt="Kakao logo" />
                                                        </div>
                                                        <span className="text-[11px] font-medium text-gray-600">네이버, 카카오 등 종사자 8명 관심</span>
                                                    </div>
                                                ) : <div />}
                                                
                                                <button
                                                    onClick={() => fetchAiInsight(news.id, news.title)}
                                                    className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs font-semibold flex items-center gap-1.5 flex-shrink-0"
                                                    disabled={loadingInsight[news.id]}
                                                >
                                                    {loadingInsight[news.id] ? (
                                                        <>
                                                            <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full"></div>
                                                            <span>생성 중...</span>
                                                        </>
                                                    ) : (
                                                        '✨ AI VIEW'
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                        {aiInsights[news.id] && (
                                            <div className="mt-2 p-4 bg-gray-50 rounded-lg text-gray-800 text-sm w-full">
                                                <p className="whitespace-pre-wrap">{aiInsights[news.id]}</p>
                                                <div className="flex items-center gap-4 text-sm text-gray-600 mt-3 border-t pt-3 border-gray-200">
                                                    <span className="font-semibold">인사이트 평가:</span>
                                                    <div className="flex items-center gap-1"><button onClick={() => handleAiInsightVote(news.id, 'up')} className="p-1 rounded-full hover:bg-green-100"><ThumbsUp size={16} className="text-green-600" /></button><span>{aiInsightMetrics[news.id]?.upvotes || 0}</span></div>
                                                    <div className="flex items-center gap-1"><button onClick={() => handleAiInsightVote(news.id, 'down')} className="p-1 rounded-full hover:bg-red-100"><ThumbsDown size={16} className="text-red-600" /></button><span>{aiInsightMetrics[news.id]?.downvotes || 0}</span></div>
                                                </div>
                                                <div className="mt-4 pt-4 border-t border-gray-200">
                                                    <h4 className="text-md font-semibold text-gray-700 mb-3 flex items-center gap-2"><MessageCircle size={18} />AI 인사이트 토론</h4>
                                                    <div className="space-y-3 mb-3 max-h-60 overflow-y-auto pr-2">
                                                        {aiInsightComments
                                                            .filter(c => c.newsId === news.id)
                                                            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
                                                            .map((comment) => {
                                                                const IconComponent = comment.role === 'ai' ? Bot : User;
                                                                return (
                                                                    <div key={comment.id} className={`p-2.5 rounded-lg text-sm flex gap-3 ${comment.role === "ai" ? "bg-blue-50" : "bg-gray-100"}`}>
                                                                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${comment.role === 'ai' ? 'bg-blue-200' : 'bg-gray-300'}`}>
                                                                            <IconComponent size={18} className={comment.role === 'ai' ? 'text-blue-700' : 'text-gray-600'} />
                                                                        </div>
                                                                        <div className="flex-grow">
                                                                            <p className="whitespace-pre-wrap text-gray-800">{comment.text}</p>
                                                                            <span className="text-xs text-gray-500 mt-1 block">
                                                                                {comment.role === "ai" ? "AI" : `User ${comment.userId?.substring(0, 6)}`} - {new Date(comment.timestamp).toLocaleString('ko-KR')}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })
                                                        }
                                                        {aiInsightComments.filter(c => c.newsId === news.id).length === 0 && <p className="text-sm text-gray-500 text-center py-4">아직 토론이 없습니다. 첫 번째 의견을 남겨보세요!</p>}
                                                    </div>
                                                    <div className="flex gap-2 items-center mt-4">
                                                        <input type="text" ref={el => commentInputRefs.current[news.id] = el} placeholder="AI에게 반박 의견 보내기..." className="flex-grow p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-100" onKeyPress={(e) => { if (e.key === 'Enter') handleAddAiInsightComment(news.id, news.title); }} disabled={isGeneratingAiReply[news.id]} />
                                                        <button onClick={() => handleAddAiInsightComment(news.id, news.title)} className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex-shrink-0 disabled:bg-blue-300 disabled:cursor-not-allowed" disabled={isGeneratingAiReply[news.id]}>{isGeneratingAiReply[news.id] ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div> : '전송'}</button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            ))}
                            {groupedNewsByDate[date].length > (showMoreCounts[date] || 3) && (
                                <div className="text-center mt-4">
                                    <button onClick={() => handleLoadMore(date)} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-full font-semibold hover:bg-gray-300 transition-colors">더 불러오기 ({groupedNewsByDate[date].length - (showMoreCounts[date] || 3)}개 남음)</button>
                                </div>
                            )}
                        </div>
                    </section>
                ))}
            </>
        )}
      </main>
    </div>
  );
};

export default ITNewsApp;
