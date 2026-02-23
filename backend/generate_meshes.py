import nilearn.datasets
import nibabel as nib
import os

print("Fetching fsaverage5 surface from nilearn datasets...")
fsaverage = nilearn.datasets.fetch_surf_fsaverage('fsaverage5')

def save_obj(filename, points, faces, name):
    print(f"Saving {filename} ({len(points)} vertices, {len(faces)} faces)...")
    with open(filename, 'w') as f:
        f.write(f"o {name}\n")
        for p in points:
            f.write(f"v {p[0]} {p[1]} {p[2]}\n")
        for face in faces:
            f.write(f"f {face[0]+1} {face[1]+1} {face[2]+1}\n")

print("Loading surfaces...")
from nilearn.surface import load_surf_mesh

# Load generic pial surface (brain folds)
lh_points, lh_faces = load_surf_mesh(fsaverage.pial_left)
rh_points, rh_faces = load_surf_mesh(fsaverage.pial_right)

save_obj('../frontend/public/lh_brain.obj', lh_points, lh_faces, 'LeftHemisphere')
save_obj('../frontend/public/rh_brain.obj', rh_points, rh_faces, 'RightHemisphere')

print("Successfully created rh_brain.obj and lh_brain.obj in frontend/public")
