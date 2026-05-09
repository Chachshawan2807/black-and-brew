# Dummy grep_ast for IDE linter
class TreeContext:
    def __init__(self, *args, **kwargs): pass
    def add_lines_of_interest(self, *args, **kwargs): pass
    def add_context(self, *args, **kwargs): pass
    def format(self, *args, **kwargs): return ""

def filename_to_lang(f): return None
PARSERS = {}
def get_language(l): return None
def get_parser(l): return None
USING_TSL_PACK = False
