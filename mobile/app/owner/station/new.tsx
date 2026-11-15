import { useState } from 'react';
import { router } from 'expo-router';
import { Screen, useSnackbar } from '@/components';
import {
  StationForm,
  useCreateStation,
  useUpdateStation,
  useUploadStationPhoto,
} from '@/features/owner';
import type { OwnerPhotoUpload } from '@/features/owner/api';
import type { StationInput } from '@/types/domain';

export default function AddStationScreen() {
  const snackbar = useSnackbar();
  const createStation = useCreateStation();
  const updateStation = useUpdateStation();
  const uploadPhoto = useUploadStationPhoto();
  const [createdStationId, setCreatedStationId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<unknown>(null);
  const isSaving = createStation.isPending || updateStation.isPending || uploadPhoto.isPending;

  async function submit(
    input: StationInput,
    photos: OwnerPhotoUpload[],
    onPhotoUploaded: (uri: string) => void,
  ) {
    setSubmitError(null);
    try {
      let stationId = createdStationId;
      if (stationId) {
        await updateStation.mutateAsync({ id: stationId, input });
      } else {
        const created = await createStation.mutateAsync(input);
        stationId = created.id;
        setCreatedStationId(stationId);
      }

      for (const photo of photos) {
        await uploadPhoto.mutateAsync({ id: stationId, photo });
        onPhotoUploaded(photo.uri);
      }

      snackbar.show('Station submitted for approval');
      router.back();
    } catch (error) {
      setSubmitError(error);
    }
  }

  return (
    <Screen title="Add station" back scroll>
      <StationForm saving={isSaving} submitError={submitError} onSubmit={submit} />
    </Screen>
  );
}
