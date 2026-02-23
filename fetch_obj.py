import urllib.request
url = 'https://raw.githubusercontent.com/martiansandwich/brain/master/brain.obj'
urllib.request.urlretrieve(url, 'frontend/public/brain.obj')
print("Downloaded brain.obj")
