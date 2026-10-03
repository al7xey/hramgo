import sys
import zipfile
import xml.etree.ElementTree as ET
from pypdf import PdfReader
sys.stdout.reconfigure(encoding='utf-8')
if zipfile.is_zipfile(sys.argv[1]):
    with zipfile.ZipFile(sys.argv[1]) as archive:
        info = archive.getinfo('word/document.xml')
        if info.file_size > 4 * 1024 * 1024:
            raise ValueError('Word document exceeds extraction limit')
        document = ET.fromstring(archive.read(info))
        ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
        for paragraph in document.findall('.//w:p', ns):
            print(''.join(node.text or '' for node in paragraph.findall('.//w:t', ns)))
else:
    reader=PdfReader(sys.argv[1])
    for page in reader.pages[:20]:
        print(page.extract_text() or '')
