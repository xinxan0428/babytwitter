from google.appengine.ext import webapp

import jinja2
import os
import cgi
import datetime
import urllib
import webapp2

from google.appengine.ext import db
from google.appengine.api import users

jinja_environment = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__)))


class MainHandler(webapp2.RequestHandler):
    def get(self):

        if users.get_current_user():
            url = users.create_logout_url(self.request.uri)
            url_linktext = 'Logout'
        else:
            url = users.create_login_url(self.request.uri)
            url_linktext = 'Login'

        template_values = {
            'logout_url': url,
            'url_linktext': url_linktext,
            'user_email': 'romanangelo.tria@gmail.com'
        }

        template = jinja_environment.get_template('templates/index.html')
        self.response.out.write(template.render(template_values))

app = webapp.WSGIApplication([('/', MainHandler)],
                             debug=True)

