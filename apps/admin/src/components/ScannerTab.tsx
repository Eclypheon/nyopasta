import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { QrCode, Camera, CheckCircle, AlertTriangle, Search, Plus, Minus, ShieldCheck, User } from 'lucide-react';
import { api, UserProfile } from '@nyopasta/shared';

interface ScannerTabProps {
  prefillUserId?: string | null;
  onClearPrefill?: () => void;
}

export function ScannerTab({ prefillUserId, onClearPrefill }: ScannerTabProps = {}) {
  const [scanning, setScanning] = useState(false);
  const [scannedUserId, setScannedUserId] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [stampsToAdd, setStampsToAdd] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Auto-populate when prefilled from Users page
  useEffect(() => {
    if (prefillUserId && prefillUserId.trim()) {
      const id = prefillUserId.trim();
      setManualInput(id);
      handleCodeScanned(id);
      onClearPrefill?.();
    }
  }, [prefillUserId]);

  const stopScannerInternal = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (err) {
        console.warn('Error during scanner cleanup:', err);
      } finally {
        scannerRef.current = null;
      }
    }
  };

  // Stop camera when unmounting
  useEffect(() => {
    return () => {
      stopScannerInternal().catch(() => {});
    };
  }, []);

  const startScanner = async () => {
    try {
      setStatusMessage(null);
      await stopScannerInternal();

      const html5QrCode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const edge = Math.max(160, Math.floor(minEdge * 0.72));
          return { width: edge, height: edge };
        },
        aspectRatio: 1.0,
      };

      const qrSuccessCallback = (decodedText: string) => {
        stopScannerInternal()
          .then(() => {
            setScanning(false);
            handleCodeScanned(decodedText);
          })
          .catch(() => {
            setScanning(false);
            handleCodeScanned(decodedText);
          });
      };

      try {
        await html5QrCode.start(
          { facingMode: 'environment' },
          config,
          qrSuccessCallback,
          () => {}
        );
      } catch (envErr) {
        console.warn('Environment camera failed, attempting default user camera fallback:', envErr);
        await html5QrCode.start(
          { facingMode: 'user' },
          config,
          qrSuccessCallback,
          () => {}
        );
      }

      setScanning(true);
    } catch (err: any) {
      console.warn('Camera scan start failed:', err);
      await stopScannerInternal();
      setScanning(false);
      setStatusMessage({
        type: 'error',
        text: 'Could not access device camera. Please check camera permissions in iOS Settings > Safari, or enter member ID manually below.',
      });
    }
  };

  const stopScanner = async () => {
    await stopScannerInternal();
    setScanning(false);
  };

  const handleCodeScanned = async (text: string) => {
    let userId = text.trim();
    if (userId.startsWith('NYO-MEMBER:')) {
      userId = userId.replace('NYO-MEMBER:', '');
    }
    setScannedUserId(userId);
    loadUserProfile(userId);
  };

  const loadUserProfile = async (userId: string) => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const prof = await api.getUserProfile(userId);
      setSelectedProfile(prof);
    } catch (e: any) {
      setStatusMessage({
        type: 'error',
        text: `Failed to load profile for ID ${userId}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    handleCodeScanned(manualInput);
  };

  const calculatedNewTotal = (selectedProfile?.currentStampCount || 0) + stampsToAdd;

  const handleConfirmMigration = async () => {
    if (!selectedProfile) return;
    setIsLoading(true);
    try {
      const updated = await api.updateUserStamps(
        selectedProfile.authUserId || selectedProfile.id,
        calculatedNewTotal,
        {
          type: 'manual_migration',
          description: `Migrated ${stampsToAdd} stamps from physical card by staff`,
          stamps: stampsToAdd,
        }
      );
      setSelectedProfile(updated);
      setShowConfirmModal(false);
      setStatusMessage({
        type: 'success',
        text: `Successfully added ${stampsToAdd} stamps. New total: ${updated.currentStampCount} stamps.`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: 'Failed to update stamps: ' + err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs text-center">
        <QrCode className="w-10 h-10 text-navy mx-auto mb-2" />
        <h2 className="font-extrabold text-lg text-gray-900">Physical Card Migration Scanner</h2>
        <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
          Scan the member QR code on the customer phone to transfer accumulated stamps from their physical loyalty card.
        </p>

        {/* Camera Scanner Viewport */}
        <div className="mt-4">
          <div className="relative w-full aspect-square bg-gray-950 rounded-2xl overflow-hidden border border-gray-800 flex items-center justify-center">
            {/* Pure DOM node for Html5Qrcode - React never diffs children inside here */}
            <div id="qr-reader" className="w-full h-full" />

            {/* Idle overlay rendered outside qr-reader */}
            {!scanning && (
              <div className="absolute inset-0 z-10 bg-gray-950 flex flex-col items-center justify-center p-6 text-center text-gray-400 text-xs">
                <Camera className="w-10 h-10 mx-auto text-gray-500 mb-2" />
                <p>Camera is currently idle.</p>
              </div>
            )}
          </div>

          <div className="mt-3 flex justify-center gap-2">
            {!scanning ? (
              <button
                type="button"
                onClick={startScanner}
                className="bg-navy hover:bg-navy-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow"
              >
                <Camera className="w-4 h-4" />
                Start Camera Scanner
              </button>
            ) : (
              <button
                type="button"
                onClick={stopScanner}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow"
              >
                Stop Scanner
              </button>
            )}
          </div>
        </div>

        {/* Manual ID Input Fallback */}
        <div className="mt-5 pt-4 border-t border-gray-100">
          <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-2">Or Key in Member ID</p>
          <form onSubmit={handleManualSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. usr_123 or member ID"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              className="flex-1 text-xs border border-gray-300 rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-terracotta"
            />
            <button
              type="submit"
              className="bg-gray-800 hover:bg-gray-900 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1"
            >
              <Search className="w-3.5 h-3.5" />
              Find
            </button>
          </form>
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {statusMessage.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Scanned Customer Details & Stamp Migration Form */}
      {selectedProfile && (
        <div className="bg-white rounded-2xl p-5 border-2 border-terracotta shadow-md space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-cream flex items-center justify-center text-terracotta font-black text-sm">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-gray-900">{selectedProfile.name}</h3>
                <p className="text-[11px] text-gray-400 font-mono">{scannedUserId}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-gray-400 uppercase font-bold">Current Stamps</span>
              <p className="text-lg font-black text-navy">{selectedProfile.currentStampCount} / 12</p>
            </div>
          </div>

          {/* Stepper to Key in Stamps */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Stamps to credit from physical card:
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStampsToAdd((prev) => Math.max(1, prev - 1))}
                className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-700"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                min="1"
                max="24"
                value={stampsToAdd}
                onChange={(e) => setStampsToAdd(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 text-center font-black text-lg border border-gray-300 rounded-xl py-1.5 focus:outline-none focus:border-terracotta"
              />
              <button
                type="button"
                onClick={() => setStampsToAdd((prev) => prev + 1)}
                className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-700"
              >
                <Plus className="w-4 h-4" />
              </button>
              <div className="flex-1 text-right">
                <span className="text-[11px] text-gray-400 block font-medium">New Total:</span>
                <span className="font-black text-base text-terracotta">{calculatedNewTotal} stamps</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            disabled={isLoading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm py-3 rounded-xl shadow-md flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            Credit Stamps to Customer
          </button>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmModal && selectedProfile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-black text-lg text-gray-900">Confirm Stamp Update</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Are you sure you want to change this customer loyalty stamp count to{' '}
              <strong className="text-terracotta font-extrabold text-sm">{calculatedNewTotal}</strong> stamps?
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs py-2.5 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmMigration}
                disabled={isLoading}
                className="flex-1 bg-terracotta hover:bg-terracotta-600 text-white font-bold text-xs py-2.5 rounded-xl shadow"
              >
                {isLoading ? 'Updating...' : 'Yes, Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
