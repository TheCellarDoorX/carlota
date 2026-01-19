'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Minus, Trophy } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface HistoryEntry {
  id: number;
  person: string;
  amount: number;
  reason: string;
  timestamp: string;
  givenBy: string | null;
  disputed: boolean;
}

interface Dispute {
  id: number;
  entry: HistoryEntry;
  disputeReason: string;
  timestamp: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface PointStats {
  positivePoints: number;
  negativePoints: number;
  entries: HistoryEntry[];
}

export default function DatePointsTracker() {
  const [myImage, setMyImage] = useState('');
  const [theirImage, setTheirImage] = useState('');
  const [myPoints, setMyPoints] = useState(0);
  const [theirPoints, setTheirPoints] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [reason, setReason] = useState('');
  const [isSetup, setIsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [animatingPerson, setAnimatingPerson] = useState<string | null>(null);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [showDisputes, setShowDisputes] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputingEntryId, setDisputingEntryId] = useState<number | null>(null);
  const [showMyHistory, setShowMyHistory] = useState(false);
  const [showTheirHistory, setShowTheirHistory] = useState(false);
  const [myHistoryFilter, setMyHistoryFilter] = useState('all');
  const [theirHistoryFilter, setTheirHistoryFilter] = useState('all');
  const [activityPlayerFilter, setActivityPlayerFilter] = useState('all');
  const [activityTypeFilter, setActivityTypeFilter] = useState('all');
  const [showSettings, setShowSettings] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  const myName = 'Filipe';
  const theirName = 'Carlota';

  // Load current user from localStorage (device-specific)
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setCurrentUser(savedUser);
    }
  }, []);

  // Save current user to localStorage when it changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', currentUser);
    }
  }, [currentUser]);

  const loadData = useCallback(async () => {
    try {
      // Load game state
      const { data: gameState, error: gameError } = await supabase
        .from('game_state')
        .select('*')
        .eq('id', 1)
        .single();

      if (gameError && gameError.code !== 'PGRST116') {
        console.error('Error loading game state:', gameError);
      }

      if (gameState) {
        setMyImage(gameState.my_image || '');
        setTheirImage(gameState.their_image || '');
        setMyPoints(gameState.my_points || 0);
        setTheirPoints(gameState.their_points || 0);
        setIsSetup(gameState.is_setup || false);
      }

      // Load history
      const { data: historyData, error: historyError } = await supabase
        .from('history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (historyError) {
        console.error('Error loading history:', historyError);
      }

      if (historyData) {
        const formattedHistory: HistoryEntry[] = historyData.map(h => ({
          id: h.id,
          person: h.person,
          amount: h.amount,
          reason: h.reason,
          timestamp: new Date(h.created_at).toLocaleString('pt-PT'),
          givenBy: h.given_by,
          disputed: h.disputed
        }));
        setHistory(formattedHistory);
      }

      // Load disputes with their entries
      const { data: disputesData, error: disputesError } = await supabase
        .from('disputes')
        .select('*, history(*)')
        .order('created_at', { ascending: false });

      if (disputesError) {
        console.error('Error loading disputes:', disputesError);
      }

      if (disputesData) {
        const formattedDisputes: Dispute[] = disputesData.map(d => ({
          id: d.id,
          entry: {
            id: d.history.id,
            person: d.history.person,
            amount: d.history.amount,
            reason: d.history.reason,
            timestamp: new Date(d.history.created_at).toLocaleString('pt-PT'),
            givenBy: d.history.given_by,
            disputed: d.history.disputed
          },
          disputeReason: d.dispute_reason,
          timestamp: new Date(d.created_at).toLocaleString('pt-PT'),
          status: d.status as 'pending' | 'approved' | 'rejected'
        }));
        setDisputes(formattedDisputes);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Set up realtime subscriptions
    const gameStateChannel = supabase
      .channel('game_state_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_state' }, () => {
        loadData();
      })
      .subscribe();

    const historyChannel = supabase
      .channel('history_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'history' }, () => {
        loadData();
      })
      .subscribe();

    const disputesChannel = supabase
      .channel('disputes_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'disputes' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(gameStateChannel);
      supabase.removeChannel(historyChannel);
      supabase.removeChannel(disputesChannel);
    };
  }, [loadData]);

  const updateGameState = async (updates: {
    my_image?: string;
    their_image?: string;
    my_points?: number;
    their_points?: number;
    is_setup?: boolean;
  }) => {
    const { error } = await supabase
      .from('game_state')
      .upsert({
        id: 1,
        ...updates,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error updating game state:', error);
    }
  };

  const handleImageUpload = (person: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (person === 'me') {
          setMyImage(reader.result as string);
        } else {
          setTheirImage(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpdate = async (person: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const newMyImage = person === 'me' ? reader.result as string : myImage;
        const newTheirImage = person === 'them' ? reader.result as string : theirImage;

        if (person === 'me') setMyImage(newMyImage);
        else setTheirImage(newTheirImage);

        await updateGameState({
          my_image: newMyImage,
          their_image: newTheirImage,
          is_setup: true
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSetup = async () => {
    if (currentUser) {
      await updateGameState({
        my_image: myImage,
        their_image: theirImage,
        my_points: 0,
        their_points: 0,
        is_setup: true
      });
      setIsSetup(true);
    }
  };

  const addPoints = async (person: string, amount: number) => {
    const personName = person === 'me' ? myName : theirName;
    const reasonText = reason || (amount > 0 ? 'Boa vibração!' : 'Ups!');

    // Insert into history
    const { data: newEntry, error: historyError } = await supabase
      .from('history')
      .insert({
        person: personName,
        amount,
        reason: reasonText,
        given_by: currentUser,
        disputed: false
      })
      .select()
      .single();

    if (historyError) {
      console.error('Error adding history entry:', historyError);
      return;
    }

    // Update points
    const newMyPoints = person === 'me' ? myPoints + amount : myPoints;
    const newTheirPoints = person === 'them' ? theirPoints + amount : theirPoints;

    await updateGameState({
      my_points: newMyPoints,
      their_points: newTheirPoints
    });

    // Update local state
    setMyPoints(newMyPoints);
    setTheirPoints(newTheirPoints);
    setReason('');
    setAnimatingPerson(person);

    if (newEntry) {
      const formattedEntry: HistoryEntry = {
        id: newEntry.id,
        person: personName,
        amount,
        reason: reasonText,
        timestamp: new Date(newEntry.created_at).toLocaleString('pt-PT'),
        givenBy: currentUser,
        disputed: false
      };
      setHistory(prev => [formattedEntry, ...prev].slice(0, 20));
    }

    setTimeout(() => setAnimatingPerson(null), 600);
  };

  const resetScores = async () => {
    if (window.confirm('Tens a certeza que queres repor todos os pontos?')) {
      // Delete all history and disputes
      await supabase.from('disputes').delete().neq('id', 0);
      await supabase.from('history').delete().neq('id', 0);

      // Reset game state
      await updateGameState({
        my_points: 0,
        their_points: 0
      });

      setMyPoints(0);
      setTheirPoints(0);
      setHistory([]);
      setDisputes([]);
    }
  };

  const disputeEntry = async (entryId: number) => {
    const entry = history.find(e => e.id === entryId);
    if (!entry || entry.disputed) return;

    if (!disputeReason.trim()) {
      alert('Precisas de dar uma razão para contestar este ponto!');
      return;
    }

    // Mark entry as disputed
    await supabase
      .from('history')
      .update({ disputed: true })
      .eq('id', entryId);

    // Create dispute
    const { data: newDispute, error } = await supabase
      .from('disputes')
      .insert({
        entry_id: entryId,
        dispute_reason: disputeReason,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating dispute:', error);
      return;
    }

    // Update local state
    setHistory(prev => prev.map(e =>
      e.id === entryId ? { ...e, disputed: true } : e
    ));

    if (newDispute) {
      const formattedDispute: Dispute = {
        id: newDispute.id,
        entry: { ...entry, disputed: true },
        disputeReason: disputeReason,
        timestamp: new Date(newDispute.created_at).toLocaleString('pt-PT'),
        status: 'pending'
      };
      setDisputes(prev => [formattedDispute, ...prev]);
    }

    setDisputeReason('');
    setDisputingEntryId(null);
  };

  const resolveDispute = async (disputeId: number, approved: boolean) => {
    const dispute = disputes.find(d => d.id === disputeId);
    if (!dispute) return;

    let newMyPoints = myPoints;
    let newTheirPoints = theirPoints;

    if (!approved) {
      if (dispute.entry.person === myName) {
        newMyPoints = myPoints - dispute.entry.amount;
      } else {
        newTheirPoints = theirPoints - dispute.entry.amount;
      }

      await updateGameState({
        my_points: newMyPoints,
        their_points: newTheirPoints
      });
    }

    // Update dispute status
    await supabase
      .from('disputes')
      .update({ status: approved ? 'approved' : 'rejected' })
      .eq('id', disputeId);

    setMyPoints(newMyPoints);
    setTheirPoints(newTheirPoints);
    setDisputes(prev => prev.map(d =>
      d.id === disputeId ? { ...d, status: approved ? 'approved' as const : 'rejected' as const } : d
    ));
  };

  const editReason = async (entryId: number, newReason: string) => {
    await supabase
      .from('history')
      .update({ reason: newReason })
      .eq('id', entryId);

    setHistory(prev => prev.map(e =>
      e.id === entryId ? { ...e, reason: newReason } : e
    ));
  };

  const getPointStats = (personName: string): PointStats => {
    const personEntries = history.filter(e => e.person === personName);
    const positivePoints = personEntries.filter(e => e.amount > 0).reduce((sum, e) => sum + e.amount, 0);
    const negativePoints = personEntries.filter(e => e.amount < 0).reduce((sum, e) => sum + e.amount, 0);
    return { positivePoints, negativePoints, entries: personEntries };
  };

  const myStats = getPointStats(myName);
  const theirStats = getPointStats(theirName);
  const leader = myPoints > theirPoints ? myName : theirPoints > myPoints ? theirName : 'Tie';

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 flex items-center justify-center">
        <div className="text-2xl text-purple-600">A carregar...</div>
      </div>
    );
  }

  if (!isSetup) {
    const hasExistingData = myImage || theirImage;

    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-purple-400 rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">
              P
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Tabela de Pontos</h1>
            <p className="text-gray-600">
              {hasExistingData ? 'Quem és tu?' : 'Configura os perfis!'}
            </p>
          </div>

          {hasExistingData && (
            <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-xl">
              <p className="text-sm text-green-800 text-center">
                <span className="font-semibold">✓ Perfis já configurados!</span><br />
                Escolhe quem és para começar.
              </p>
            </div>
          )}

          {!hasExistingData && !currentUser && (
            <div className="mb-6">
              <p className="text-sm text-gray-600 text-center mb-3">Primeiro, quem és tu?</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setCurrentUser('Filipe')}
                  className="p-4 bg-pink-100 border-2 border-pink-300 rounded-xl hover:bg-pink-200 transition-all"
                >
                  <div className="text-center">
                    <div className="text-3xl mb-2">👨</div>
                    <div className="font-bold text-pink-700">Filipe</div>
                    <div className="text-xs text-gray-500 italic">Cromo dos mapas</div>
                  </div>
                </button>
                <button
                  onClick={() => setCurrentUser('Carlota')}
                  className="p-4 bg-purple-100 border-2 border-purple-300 rounded-xl hover:bg-purple-200 transition-all"
                >
                  <div className="text-center">
                    <div className="text-3xl mb-2">👩</div>
                    <div className="font-bold text-purple-700">Carlota</div>
                    <div className="text-xs text-gray-500 italic">Palhaça</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {(currentUser || hasExistingData) && (
            <div className="space-y-4">
              {currentUser && !hasExistingData && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800 text-center">
                    📸 Por favor adiciona uma foto de perfil para começar
                  </p>
                </div>
              )}

              {(currentUser === 'Filipe' || hasExistingData) && (
                <div className="p-4 bg-pink-50 rounded-xl border-2 border-pink-200">
                  <div className="flex items-center gap-4">
                    {myImage ? (
                      <img src={myImage} alt="Filipe" className="w-16 h-16 rounded-full object-cover border-2 border-pink-400" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-2xl">
                        👨
                      </div>
                    )}
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Filipe</label>
                      <div className="text-xs text-gray-500 italic mb-1">Cromo dos mapas</div>
                      <div className="text-sm font-semibold text-pink-700">
                        {currentUser === 'Filipe' ? '(Tu)' : hasExistingData ? '(Outro jogador)' : ''}
                      </div>
                    </div>
                  </div>
                  {currentUser === 'Filipe' && !myImage && (
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">A tua foto</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload('me', e)}
                        className="text-xs text-gray-600 file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-pink-100 file:text-pink-700 hover:file:bg-pink-200"
                      />
                    </div>
                  )}
                </div>
              )}

              {(currentUser === 'Carlota' || hasExistingData) && (
                <div className="p-4 bg-purple-50 rounded-xl border-2 border-purple-200">
                  <div className="flex items-center gap-4">
                    {theirImage ? (
                      <img src={theirImage} alt="Carlota" className="w-16 h-16 rounded-full object-cover border-2 border-purple-400" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-2xl">
                        👩
                      </div>
                    )}
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Carlota</label>
                      <div className="text-xs text-gray-500 italic mb-1">Palhaça</div>
                      <div className="text-sm font-semibold text-purple-700">
                        {currentUser === 'Carlota' ? '(Tu)' : hasExistingData ? '(Outro jogador)' : ''}
                      </div>
                    </div>
                  </div>
                  {currentUser === 'Carlota' && !theirImage && (
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">A tua foto</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload('them', e)}
                        className="text-xs text-gray-600 file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200"
                      />
                    </div>
                  )}
                </div>
              )}

              {hasExistingData && !currentUser && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setCurrentUser('Filipe')}
                    className="p-3 bg-pink-100 border-2 border-pink-300 rounded-xl hover:bg-pink-200 transition-all font-semibold text-pink-700"
                  >
                    Sou o Filipe
                  </button>
                  <button
                    onClick={() => setCurrentUser('Carlota')}
                    className="p-3 bg-purple-100 border-2 border-purple-300 rounded-xl hover:bg-purple-200 transition-all font-semibold text-purple-700"
                  >
                    Sou a Carlota
                  </button>
                </div>
              )}

              <button
                onClick={handleSetup}
                disabled={currentUser === 'Filipe' ? !myImage : !theirImage}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {hasExistingData ? 'Começar! 🎉' : 'Começar a Contar Pontos! 🎉'}
              </button>

              {currentUser && !hasExistingData && (
                <button
                  onClick={() => setCurrentUser(null)}
                  className="w-full text-sm text-gray-500 hover:text-gray-700 py-2"
                >
                  ← Mudar utilizador
                </button>
              )}
            </div>
          )}

          {!hasExistingData && !currentUser && (
            <div className="mt-6 p-4 bg-blue-50 rounded-xl">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">💡 Dica:</span> Preenche os dois perfis para começar!
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const isFilipe = currentUser === 'Filipe';

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-lg hover:shadow-xl transition-all"
          >
            <img
              src={isFilipe ? myImage : theirImage}
              alt={currentUser || ''}
              className="w-8 h-8 rounded-full object-cover border-2 border-gray-300"
            />
            <span className="font-semibold text-gray-700">{currentUser || 'Utilizador'}</span>
          </button>
          <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
            ● Sincronizado
          </div>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Tabela de Pontos</h1>
          {leader !== 'Tie' && (
            <div className="flex items-center justify-center gap-2 text-lg text-purple-600">
              <Trophy className="w-5 h-5" />
              <span>{leader} está a ganhar!</span>
            </div>
          )}
          {leader === 'Tie' && (
            <div className="text-lg text-purple-600">Empate perfeito! 🤝</div>
          )}
          <button
            onClick={() => setShowDisputes(!showDisputes)}
            className="mt-3 px-6 py-2 bg-amber-500 text-white rounded-full font-semibold hover:bg-amber-600 transition-all shadow-lg"
          >
            ⚖️ Contestar Ponto {disputes.filter(d => d.status === 'pending').length > 0 && `(${disputes.filter(d => d.status === 'pending').length})`}
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {isFilipe ? (
            <>
              <ScoreCard
                name={theirName}
                image={theirImage}
                points={theirPoints}
                stats={theirStats}
                color="purple"
                animating={animatingPerson === 'them'}
                showHistory={showTheirHistory}
                setShowHistory={setShowTheirHistory}
                historyFilter={theirHistoryFilter}
                setHistoryFilter={setTheirHistoryFilter}
                reason={reason}
                setReason={setReason}
                onAddPoints={(amt) => addPoints('them', amt)}
                onImageUpdate={(e) => handleImageUpdate('them', e)}
                canControl={true}
                canChangeImage={false}
              />
              <ScoreCard
                name={myName}
                image={myImage}
                points={myPoints}
                stats={myStats}
                color="pink"
                animating={animatingPerson === 'me'}
                showHistory={showMyHistory}
                setShowHistory={setShowMyHistory}
                historyFilter={myHistoryFilter}
                setHistoryFilter={setMyHistoryFilter}
                reason={reason}
                setReason={setReason}
                onAddPoints={(amt) => addPoints('me', amt)}
                onImageUpdate={(e) => handleImageUpdate('me', e)}
                canControl={false}
                isCurrentUser={true}
                controlledBy={theirName}
                canChangeImage={true}
              />
            </>
          ) : (
            <>
              <ScoreCard
                name={myName}
                image={myImage}
                points={myPoints}
                stats={myStats}
                color="pink"
                animating={animatingPerson === 'me'}
                showHistory={showMyHistory}
                setShowHistory={setShowMyHistory}
                historyFilter={myHistoryFilter}
                setHistoryFilter={setMyHistoryFilter}
                reason={reason}
                setReason={setReason}
                onAddPoints={(amt) => addPoints('me', amt)}
                onImageUpdate={(e) => handleImageUpdate('me', e)}
                canControl={true}
                canChangeImage={false}
              />
              <ScoreCard
                name={theirName}
                image={theirImage}
                points={theirPoints}
                stats={theirStats}
                color="purple"
                animating={animatingPerson === 'them'}
                showHistory={showTheirHistory}
                setShowHistory={setShowTheirHistory}
                historyFilter={theirHistoryFilter}
                setHistoryFilter={setTheirHistoryFilter}
                reason={reason}
                setReason={setReason}
                onAddPoints={(amt) => addPoints('them', amt)}
                onImageUpdate={(e) => handleImageUpdate('them', e)}
                canControl={false}
                isCurrentUser={true}
                controlledBy={myName}
                canChangeImage={true}
              />
            </>
          )}
        </div>

        {showDisputes && (
          <DisputesModal
            disputes={disputes}
            onClose={() => setShowDisputes(false)}
            onResolve={resolveDispute}
          />
        )}

        {history.length > 0 && (
          <ActivityHistory
            history={history}
            activityPlayerFilter={activityPlayerFilter}
            setActivityPlayerFilter={setActivityPlayerFilter}
            activityTypeFilter={activityTypeFilter}
            setActivityTypeFilter={setActivityTypeFilter}
            myName={myName}
            theirName={theirName}
            currentUser={currentUser}
            disputingEntryId={disputingEntryId}
            setDisputingEntryId={setDisputingEntryId}
            disputeReason={disputeReason}
            setDisputeReason={setDisputeReason}
            onDisputeEntry={disputeEntry}
            onReset={resetScores}
            onEditReason={editReason}
          />
        )}

        <div className="mt-6 text-center text-sm text-gray-600">
          Feito com ❤️ para o Filipe e a Carlota
        </div>

        {showSettings && (
          <SettingsModal
            myName={myName}
            theirName={theirName}
            myImage={myImage}
            theirImage={theirImage}
            myPoints={myPoints}
            theirPoints={theirPoints}
            currentUser={currentUser}
            onClose={() => setShowSettings(false)}
          />
        )}
      </div>
    </div>
  );
}

interface ScoreCardProps {
  name: string;
  image: string;
  points: number;
  stats: PointStats;
  color: 'pink' | 'purple';
  animating: boolean;
  showHistory: boolean;
  setShowHistory: (show: boolean) => void;
  historyFilter: string;
  setHistoryFilter: (filter: string) => void;
  reason: string;
  setReason: (reason: string) => void;
  onAddPoints: (amount: number) => void;
  onImageUpdate: (e: React.ChangeEvent<HTMLInputElement>) => void;
  canControl: boolean;
  isCurrentUser?: boolean;
  controlledBy?: string;
  canChangeImage: boolean;
}

function ScoreCard({ name, image, points, stats, color, animating, showHistory, setShowHistory, historyFilter, setHistoryFilter, reason, setReason, onAddPoints, onImageUpdate, canControl, isCurrentUser, controlledBy, canChangeImage }: ScoreCardProps) {
  const colorClasses = {
    pink: {
      ring: 'ring-pink-400',
      border: 'border-pink-200',
      bg: 'bg-pink-50',
      text: 'text-pink-600',
      textDark: 'text-pink-700',
      focus: 'focus:border-pink-500'
    },
    purple: {
      ring: 'ring-purple-400',
      border: 'border-purple-200',
      bg: 'bg-purple-50',
      text: 'text-purple-600',
      textDark: 'text-purple-700',
      focus: 'focus:border-purple-500'
    }
  };

  const c = colorClasses[color];

  return (
    <div className={`bg-white rounded-3xl shadow-xl p-6 transition-all duration-300 ${animating ? `scale-105 ring-4 ${c.ring}` : ''}`}>
      <div className="flex items-center gap-4 mb-4">
        <div className="relative">
          <img src={image} alt={name} className={`w-20 h-20 rounded-full object-cover border-4 ${c.border}`} />
          {canChangeImage && (
            <button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e) => onImageUpdate(e as unknown as React.ChangeEvent<HTMLInputElement>);
                input.click();
              }}
              className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-70 rounded-full transition-all flex items-center justify-center group cursor-pointer"
              title="Clica para mudar a foto"
            >
              <span className="text-black text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg">
                Mudar
              </span>
            </button>
          )}
        </div>
        <div className="flex-1">
          <h2 className={`text-2xl font-bold ${c.text} mb-1`}>{name}{isCurrentUser && ' (Tu)'}</h2>
          <div className="flex items-end gap-3">
            <div className="text-5xl font-bold text-gray-800">{points}</div>
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => {
                  setShowHistory(!showHistory || historyFilter !== 'positive');
                  setHistoryFilter('positive');
                }}
                className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-200 transition-all"
              >
                +{stats.positivePoints}
              </button>
              <button
                onClick={() => {
                  setShowHistory(!showHistory || historyFilter !== 'negative');
                  setHistoryFilter('negative');
                }}
                className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-200 transition-all"
              >
                {stats.negativePoints}
              </button>
            </div>
          </div>
          <div className="text-sm text-gray-500">pontos</div>
        </div>
      </div>

      {showHistory && (
        <div className={`mb-4 p-3 ${c.bg} rounded-xl max-h-48 overflow-y-auto`}>
          <div className="flex items-center justify-between mb-2">
            <h4 className={`font-semibold ${c.textDark} text-sm`}>
              Histórico de {name} - {historyFilter === 'positive' ? 'Pontos Positivos' : historyFilter === 'negative' ? 'Pontos Negativos' : 'Todos'}
            </h4>
            <button
              onClick={() => setShowHistory(false)}
              className={`${c.text} hover:${c.textDark} font-bold`}
            >
              ×
            </button>
          </div>
          <div className="space-y-1">
            {stats.entries.filter(e =>
              historyFilter === 'positive' ? e.amount > 0 :
              historyFilter === 'negative' ? e.amount < 0 :
              true
            ).length === 0 ? (
              <div className="text-xs text-gray-500 text-center py-2">
                {historyFilter === 'positive' ? 'Ainda sem pontos positivos' :
                 historyFilter === 'negative' ? 'Ainda sem pontos negativos' :
                 'Ainda sem pontos'}
              </div>
            ) : (
              stats.entries.filter(e =>
                historyFilter === 'positive' ? e.amount > 0 :
                historyFilter === 'negative' ? e.amount < 0 :
                true
              ).map((entry, idx) => (
                <div key={idx} className="text-xs bg-white p-2 rounded-lg">
                  <div className="flex justify-between">
                    <span className={entry.amount > 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                      {entry.amount > 0 ? '+' : ''}{entry.amount}
                    </span>
                    <span className="text-gray-400">{entry.timestamp}</span>
                  </div>
                  <div className="text-gray-600 mt-1">{entry.reason}</div>
                  {entry.givenBy && (
                    <div className="text-gray-400 text-xs mt-1">
                      Dado {entry.givenBy === 'Filipe' ? 'pelo' : 'pela'} {entry.givenBy}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {canControl ? (
        <div className="space-y-3">
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={`w-full px-4 py-2 border-2 border-gray-300 rounded-xl ${c.focus} focus:outline-none text-sm`}
            placeholder="Razão (obrigatório)"
          />

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onAddPoints(1)}
              disabled={!reason.trim()}
              className="flex items-center justify-center gap-2 bg-green-500 text-white py-3 rounded-xl font-semibold hover:bg-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-5 h-5" />
              +1 para {name}
            </button>
            <button
              onClick={() => onAddPoints(-1)}
              disabled={!reason.trim()}
              className="flex items-center justify-center gap-2 bg-red-500 text-white py-3 rounded-xl font-semibold hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Minus className="w-5 h-5" />
              -1 para {name}
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-gray-50 rounded-xl text-center text-sm text-gray-600">
          {controlledBy ? `O ${controlledBy} controla os teus pontos` : 'Visualização apenas'}
        </div>
      )}
    </div>
  );
}

interface DisputesModalProps {
  disputes: Dispute[];
  onClose: () => void;
  onResolve: (disputeId: number, approved: boolean) => void;
}

function DisputesModal({ disputes, onClose, onResolve }: DisputesModalProps) {
  return (
    <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-2xl font-bold text-amber-600">⚖️ Contestar Ponto</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 font-bold text-2xl"
        >
          ×
        </button>
      </div>

      {disputes.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Ainda não há contestações. A justiça prevalece! ⚖️
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map((dispute) => (
            <div
              key={dispute.id}
              className={`p-4 rounded-xl border-2 ${
                dispute.status === 'pending'
                  ? 'border-amber-300 bg-amber-50'
                  : dispute.status === 'approved'
                  ? 'border-green-300 bg-green-50'
                  : 'border-red-300 bg-red-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-semibold text-gray-800 mb-2">
                    {dispute.entry.person}
                    <span className={`ml-2 ${dispute.entry.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {dispute.entry.amount > 0 ? '+' : ''}{dispute.entry.amount}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-1">
                    <span className="font-semibold">Razão original:</span> {dispute.entry.reason}
                  </div>
                  <div className="text-sm text-amber-700 bg-amber-100 p-2 rounded-lg mb-2">
                    <span className="font-semibold">Contestação:</span> {dispute.disputeReason}
                  </div>
                  <div className="text-xs text-gray-400">Contestado: {dispute.timestamp}</div>
                  {dispute.status !== 'pending' && (
                    <div className={`text-sm font-semibold mt-2 ${
                      dispute.status === 'approved' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {dispute.status === 'approved' ? '✓ Mantido' : '✗ Revertido'}
                    </div>
                  )}
                </div>

                {dispute.status === 'pending' && (
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => onResolve(dispute.id, true)}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-all text-sm"
                    >
                      ✓ Manter
                    </button>
                    <button
                      onClick={() => onResolve(dispute.id, false)}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-all text-sm"
                    >
                      ✗ Reverter
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface ActivityHistoryProps {
  history: HistoryEntry[];
  activityPlayerFilter: string;
  setActivityPlayerFilter: (filter: string) => void;
  activityTypeFilter: string;
  setActivityTypeFilter: (filter: string) => void;
  myName: string;
  theirName: string;
  currentUser: string | null;
  disputingEntryId: number | null;
  setDisputingEntryId: (id: number | null) => void;
  disputeReason: string;
  setDisputeReason: (reason: string) => void;
  onDisputeEntry: (entryId: number) => void;
  onReset: () => void;
  onEditReason: (entryId: number, newReason: string) => void;
}

function ActivityHistory({ history, activityPlayerFilter, setActivityPlayerFilter, activityTypeFilter, setActivityTypeFilter, myName, theirName, currentUser, disputingEntryId, setDisputingEntryId, disputeReason, setDisputeReason, onDisputeEntry, onEditReason }: ActivityHistoryProps) {
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [editedReason, setEditedReason] = useState('');

  const filteredHistory = history.filter(entry => {
    const playerMatch = activityPlayerFilter === 'all' || entry.person === activityPlayerFilter;
    const typeMatch = activityTypeFilter === 'all' ||
      (activityTypeFilter === 'positive' && entry.amount > 0) ||
      (activityTypeFilter === 'negative' && entry.amount < 0);
    return playerMatch && typeMatch;
  });

  const handleEditReason = (entry: HistoryEntry) => {
    setEditingEntryId(entry.id);
    setEditedReason(entry.reason);
  };

  const handleSaveReason = (entryId: number) => {
    if (!editedReason.trim()) {
      alert('A razão não pode estar vazia!');
      return;
    }

    onEditReason(entryId, editedReason);
    setEditingEntryId(null);
    setEditedReason('');
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-800">Atividade Recente</h3>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">Jogador</label>
          <select
            value={activityPlayerFilter}
            onChange={(e) => setActivityPlayerFilter(e.target.value)}
            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none text-sm"
          >
            <option value="all">Todos</option>
            <option value={myName}>{myName}</option>
            <option value={theirName}>{theirName}</option>
          </select>
        </div>

        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de Pontos</label>
          <select
            value={activityTypeFilter}
            onChange={(e) => setActivityTypeFilter(e.target.value)}
            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none text-sm"
          >
            <option value="all">Todos</option>
            <option value="positive">Positivos (+)</option>
            <option value="negative">Negativos (-)</option>
          </select>
        </div>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredHistory.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nenhuma atividade corresponde aos filtros selecionados.
          </div>
        ) : (
          filteredHistory.map((entry, index) => {
            const canDispute = entry.person === currentUser && !entry.disputed;
            const canEdit = entry.givenBy === currentUser && !entry.disputed;

            return (
              <div
                key={index}
                className={`p-3 rounded-xl ${
                  entry.disputed ? 'bg-amber-50 border-2 border-amber-200' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800">
                      {entry.person}
                      <span className={`ml-2 ${entry.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {entry.amount > 0 ? '+' : ''}{entry.amount}
                      </span>
                      {entry.disputed && (
                        <span className="ml-2 text-xs text-amber-600 font-bold">⚖️ CONTESTADO</span>
                      )}
                    </div>

                    {editingEntryId === entry.id ? (
                      <div className="mt-2 flex gap-2">
                        <input
                          type="text"
                          value={editedReason}
                          onChange={(e) => setEditedReason(e.target.value)}
                          className="flex-1 px-3 py-2 border-2 border-blue-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                          placeholder="Nova razão"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveReason(entry.id)}
                          className="px-3 py-2 bg-blue-500 text-white rounded-lg text-xs font-semibold hover:bg-blue-600 transition-all"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={() => {
                            setEditingEntryId(null);
                            setEditedReason('');
                          }}
                          className="px-3 py-2 bg-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-400 transition-all"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600 flex items-center gap-2">
                        <span>{entry.reason}</span>
                        {canEdit && (
                          <button
                            onClick={() => handleEditReason(entry)}
                            className="text-blue-500 hover:text-blue-700"
                            title="Editar razão"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )}

                    {entry.givenBy && editingEntryId !== entry.id && (
                      <div className="text-xs text-gray-400 mt-1">
                        Dado {entry.givenBy === 'Filipe' ? 'pelo' : 'pela'} {entry.givenBy}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-gray-400">{entry.timestamp}</div>
                    {canDispute && editingEntryId !== entry.id && (
                      <button
                        onClick={() => setDisputingEntryId(entry.id === disputingEntryId ? null : entry.id)}
                        className="px-3 py-1 bg-amber-500 text-white rounded-lg text-xs font-semibold hover:bg-amber-600 transition-all"
                      >
                        {entry.id === disputingEntryId ? 'Cancelar' : 'Contestar'}
                      </button>
                    )}
                  </div>
                </div>
                {entry.id === disputingEntryId && !entry.disputed && editingEntryId !== entry.id && (
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      className="flex-1 px-3 py-2 border-2 border-amber-300 rounded-lg focus:border-amber-500 focus:outline-none text-sm"
                      placeholder="Porque é que contestas este ponto?"
                    />
                    <button
                      onClick={() => onDisputeEntry(entry.id)}
                      disabled={!disputeReason.trim()}
                      className="px-4 py-2 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Enviar
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

interface SettingsModalProps {
  myName: string;
  theirName: string;
  myImage: string;
  theirImage: string;
  myPoints: number;
  theirPoints: number;
  currentUser: string | null;
  onClose: () => void;
}

function SettingsModal({ myName, theirName, myImage, theirImage, myPoints, theirPoints, currentUser, onClose }: SettingsModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Perfis</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 font-bold text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-pink-50 rounded-xl border-2 border-pink-200">
            <div className="flex items-center gap-4">
              <img src={myImage} alt="Filipe" className="w-16 h-16 rounded-full object-cover border-2 border-pink-400" />
              <div className="flex-1">
                <h3 className="font-bold text-pink-700 text-lg">{myName}</h3>
                <div className="text-sm text-gray-600">
                  Pontos: <span className="font-semibold">{myPoints}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-purple-50 rounded-xl border-2 border-purple-200">
            <div className="flex items-center gap-4">
              <img src={theirImage} alt="Carlota" className="w-16 h-16 rounded-full object-cover border-2 border-purple-400" />
              <div className="flex-1">
                <h3 className="font-bold text-purple-700 text-lg">{theirName}</h3>
                <div className="text-sm text-gray-600">
                  Pontos: <span className="font-semibold">{theirPoints}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Utilizador atual: <span className="font-semibold">{currentUser || 'Não definido'}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
