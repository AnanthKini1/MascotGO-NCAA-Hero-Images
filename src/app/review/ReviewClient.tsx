'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { VoteType } from '@/generated/prisma/enums';

type Vote = {
  id: string;
  userEmail: string;
  type: VoteType;
};

type Image = {
  id: string;
  sourceUrl: string;
  thumbnailUrl: string;
  blobUrl: string | null;
  width: number;
  height: number;
  azureScore: number | null;
  status: string;
  votes: Vote[];
};

type School = {
  id: string;
  name: string;
  _count: { images: number };
};

type SchoolWithImages = School & { images: Image[] };

export default function ReviewClient({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const [schools, setSchools] = useState<School[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [schoolData, setSchoolData] = useState<Record<string, SchoolWithImages>>({});
  const [loadingImages, setLoadingImages] = useState<string | null>(null);
  const [votingImageId, setVotingImageId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/schools')
      .then((r) => r.json())
      .then((data) => {
        setSchools(Array.isArray(data) ? data : []);
      })
      .catch(() => setSchools([]))
      .finally(() => setLoadingSchools(false));
  }, []);

  const loadImages = useCallback(
    async (schoolName: string) => {
      if (schoolData[schoolName]) return;
      setLoadingImages(schoolName);
      try {
        const res = await fetch(
          `/api/schools/${encodeURIComponent(schoolName)}`
        );
        const data = await res.json();
        if (res.ok) {
          setSchoolData((prev) => ({ ...prev, [schoolName]: data }));
        }
      } finally {
        setLoadingImages(null);
      }
    },
    [schoolData]
  );

  function toggleSchool(name: string) {
    if (expanded === name) {
      setExpanded(null);
    } else {
      setExpanded(name);
      loadImages(name);
    }
  }

  async function vote(imageId: string, type: VoteType) {
    setVotingImageId(imageId);
    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId, type }),
      });
      if (res.ok) {
        const newVote: Vote = await res.json();
        // Update in place
        setSchoolData((prev) => {
          const updated = { ...prev };
          for (const name of Object.keys(updated)) {
            updated[name] = {
              ...updated[name],
              images: updated[name].images.map((img) => {
                if (img.id !== imageId) return img;
                const filtered = img.votes.filter(
                  (v) => v.userEmail !== userEmail
                );
                return { ...img, votes: [...filtered, newVote] };
              }),
            };
          }
          return updated;
        });
      }
    } finally {
      setVotingImageId(null);
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 px-6 py-3 flex items-center justify-between">
        <div>
          <span className="font-semibold text-zinc-900 dark:text-zinc-50">
            MascotGO Review
          </span>
          <span className="ml-3 text-xs text-zinc-500 dark:text-zinc-400">
            {userEmail}
          </span>
        </div>
        <button
          onClick={logout}
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors"
        >
          Sign out
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-4 text-sm text-zinc-500">
          {loadingSchools
            ? 'Loading schools…'
            : `${schools.length} NCAA schools`}
        </div>

        {/* Schools accordion */}
        <div className="space-y-1">
          {schools.map((school) => {
            const isOpen = expanded === school.name;
            const data = schoolData[school.name];
            const isLoadingThis = loadingImages === school.name;

            return (
              <div
                key={school.id}
                className="rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden"
              >
                {/* School row */}
                <button
                  onClick={() => toggleSchool(school.name)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-left transition-colors"
                >
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    {school.name}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-400">
                      {school._count.images} image
                      {school._count.images !== 1 ? 's' : ''}
                    </span>
                    <span className="text-zinc-400">
                      {isOpen ? '▲' : '▼'}
                    </span>
                  </div>
                </button>

                {/* Image panel */}
                {isOpen && (
                  <div className="border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 p-4">
                    {isLoadingThis && (
                      <p className="text-sm text-zinc-400">Loading images…</p>
                    )}

                    {data && data.images.length === 0 && (
                      <p className="text-sm text-zinc-400 italic">
                        No images yet — pipeline hasn&apos;t run for this school.
                      </p>
                    )}

                    {data && data.images.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {data.images.map((img) => {
                          const myVote = img.votes.find(
                            (v) => v.userEmail === userEmail
                          );
                          const approveCount = img.votes.filter(
                            (v) => v.type === VoteType.APPROVE
                          ).length;
                          const rejectCount = img.votes.filter(
                            (v) => v.type === VoteType.REJECT
                          ).length;
                          const isVoting = votingImageId === img.id;

                          return (
                            <div
                              key={img.id}
                              className="rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                            >
                              {/* Thumbnail */}
                              <div className="relative aspect-video bg-zinc-100 dark:bg-zinc-700">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={img.blobUrl ?? img.thumbnailUrl}
                                  alt={`${school.name} image`}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              </div>

                              {/* Metadata */}
                              <div className="px-3 py-2 text-xs text-zinc-500 space-y-0.5">
                                <p>
                                  {img.width} × {img.height}
                                </p>
                                {img.azureScore !== null && (
                                  <p>Score: {img.azureScore.toFixed(2)}</p>
                                )}
                                <p className="capitalize">
                                  {img.status.toLowerCase()}
                                </p>
                              </div>

                              {/* Vote buttons */}
                              <div className="px-3 pb-3 flex gap-2">
                                <button
                                  onClick={() =>
                                    vote(img.id, VoteType.APPROVE)
                                  }
                                  disabled={isVoting}
                                  className={`flex-1 rounded-md py-1 text-xs font-medium transition-colors ${
                                    myVote?.type === VoteType.APPROVE
                                      ? 'bg-green-600 text-white'
                                      : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-green-100 dark:hover:bg-green-900'
                                  } disabled:opacity-50`}
                                >
                                  ✓ {approveCount}
                                </button>
                                <button
                                  onClick={() =>
                                    vote(img.id, VoteType.REJECT)
                                  }
                                  disabled={isVoting}
                                  className={`flex-1 rounded-md py-1 text-xs font-medium transition-colors ${
                                    myVote?.type === VoteType.REJECT
                                      ? 'bg-red-600 text-white'
                                      : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-red-100 dark:hover:bg-red-900'
                                  } disabled:opacity-50`}
                                >
                                  ✗ {rejectCount}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
