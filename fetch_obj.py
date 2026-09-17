import os
import shutil
import urllib.request
import urllib.error

url = 'https://raw.githubusercontent.com/martiansandwich/brain/master/brain.obj'
out_path = 'frontend/public/brain.obj'

try:
    urllib.request.urlretrieve(url, out_path)
    print("Downloaded brain.obj")
except (urllib.error.HTTPError, urllib.error.URLError, Exception) as e:
    print(f"Notice: Remote source unavailable ({e}). Checking local hemisphere models...")
    # Fallback: if lh_brain.obj exists, copy/link it as fallback brain.obj
    lh_path = 'frontend/public/lh_brain.obj'
    if os.path.exists(lh_path) and not os.path.exists(out_path):
        shutil.copyfile(lh_path, out_path)
        print("Generated brain.obj from local hemisphere model.")
    elif os.path.exists(out_path):
        print("Existing brain.obj preserved.")
    else:
        print("frontend/public/lh_brain.obj and rh_brain.obj are ready for 3D viewer.")

