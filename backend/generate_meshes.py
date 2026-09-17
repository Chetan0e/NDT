import os
import sys

# Check existing OBJ outputs
lh_target = os.path.join(os.path.dirname(__file__), '../frontend/public/lh_brain.obj')
rh_target = os.path.join(os.path.dirname(__file__), '../frontend/public/rh_brain.obj')

try:
    import nilearn.datasets
    import nibabel as nib
    from nilearn.surface import load_surf_mesh
except ImportError:
    if os.path.exists(lh_target) and os.path.exists(rh_target):
        print("[INFO] Mesh models already exist at frontend/public: lh_brain.obj, rh_brain.obj")
        print("       To regenerate meshes, install nilearn: pip install nilearn")
        sys.exit(0)
    else:
        print("[ERROR] 'nilearn' is required to fetch and generate brain meshes.")
        print("        Please install it with: pip install nilearn")
        sys.exit(1)

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

# Load generic pial surface (brain folds)
lh_points, lh_faces = load_surf_mesh(fsaverage.pial_left)
rh_points, rh_faces = load_surf_mesh(fsaverage.pial_right)

save_obj('../frontend/public/lh_brain.obj', lh_points, lh_faces, 'LeftHemisphere')
save_obj('../frontend/public/rh_brain.obj', rh_points, rh_faces, 'RightHemisphere')

print("Successfully created rh_brain.obj and lh_brain.obj in frontend/public")
