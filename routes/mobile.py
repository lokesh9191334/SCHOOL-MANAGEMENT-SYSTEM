from flask import Blueprint, render_template

mobile_bp = Blueprint('mobile', __name__)

@mobile_bp.route('/')
def mobile_index():
    """Mobile and PWA testing page"""
    return render_template('mobile_test.html')

@mobile_bp.route('/mobile-test')
def mobile_test():
    """Mobile and PWA testing page"""
    return render_template('mobile_test.html')
